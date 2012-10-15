#import "AppDelegate.h"
#import <QuartzCore/QuartzCore.h>
#import "UIDeviceHardware.h"
#import "BTTextInput.h"
#import "BTImage.h"

@implementation AppDelegate

- (void)setupModules {
    [BTTextInput setup:self];
    [BTImage setup:self];
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {

        NSString* mode;
        mode = @"testflight";
        NSString* host = @"https://dogoapp.com";
        NSString* port = @"";
#ifdef TESTFLIGHT
        mode = @"testflight";
#endif
#ifdef APPSTORE
        mode = @"appstore";
#endif

        if (!mode) {
            mode = @"dev";
            [WebViewJavascriptBridge enableLogging];
            NSString* hostnameFile = [[NSBundle mainBundle] pathForResource:@"dev-hostname" ofType:@"txt"];
            host = [NSString stringWithContentsOfFile:hostnameFile encoding:NSUTF8StringEncoding error:nil];
            host = [host stringByReplacingOccurrencesOfString:@"\n" withString:@""];
            host = [@"http://" stringByAppendingString:host];
            port = @"9000";
        }
        
        NSDictionary* device = [NSDictionary dictionaryWithObjectsAndKeys:
                                [[UIDevice currentDevice] systemVersion], @"systemVersion",
                                [UIDevice currentDevice].model, @"model",
                                [UIDevice currentDevice].name, @"name",
                                [UIDeviceHardware platformString], @"platform",
                                nil];
        
        BOOL devMode = [mode isEqualToString:@"dev"];
        [self setServerHost:host port:port];

        [self.config setValue:mode forKey:@"mode"];
        [self.config setValue:[self getCurrentVersion] forKey:@"currentVersion"];
        [self.config setValue:device forKey:@"device"];
        [self.config setValue:self.serverUrl forKey:@"serverUrl"];
        
        [[UIApplication sharedApplication] setStatusBarStyle:UIStatusBarStyleBlackOpaque];
        
        _facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
        
        [[self.webView scrollView] setBounces:NO];
        self.webView.dataDetectorTypes = UIDataDetectorTypeNone;
        
        [self startApp:devMode];
        
        return YES;
    } else {
        return NO;
    }
}

- (void)setupNetHandlers {
    [super setupNetHandlers];

    NSString* staticPrefix = @"/static/";
    [WebViewProxy handleRequestsWithHost:self.serverHost pathPrefix:@"/static/img" handler:^(NSURLRequest *req, WVPResponse *res) {
        NSString* path = [req.URL.path substringFromIndex:staticPrefix.length];
        NSData* data = [NSData dataWithContentsOfFile:[[NSBundle mainBundle] pathForResource:path ofType:nil]];
        [res respondWithData:data mimeType:nil];
    }];
    
    [WebViewProxy handleRequestsWithHost:self.serverHost pathPrefix:@"/static/fonts" handler:^(NSURLRequest* req, WVPResponse *res) {
        NSString* path = [req.URL.path substringFromIndex:staticPrefix.length];
        NSData* data = [NSData dataWithContentsOfFile:[[NSBundle mainBundle] pathForResource:path ofType:nil]];
        [res respondWithData:data mimeType:nil];
    }];
}

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    if (navigationType == UIWebViewNavigationTypeLinkClicked) {
        [[UIApplication sharedApplication] openURL:[request URL]];
        return NO;
    }
    return YES;
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    return [_facebook handleOpenURL:url];
}

+ (AppDelegate *)instance {
    return (AppDelegate*) [UIApplication sharedApplication];
}


// Commands
- (void)setupBridgeHandlers {
    [super setupBridgeHandlers];
    // facebook.*
    [self.javascriptBridge registerHandler:@"facebook.connect" handler:^(id data, WVJBResponse* response) {
        _facebookResponse = response;
        [_facebook authorize:[data objectForKey:@"permissions"]];
    }];
    [self.javascriptBridge registerHandler:@"facebook.dialog" handler:^(id data, WVJBResponse* response) {
        NSString* dialog = [data objectForKey:@"dialog"]; // oauth, feed, and apprequests
        NSMutableDictionary* params = [NSMutableDictionary dictionaryWithDictionary:[data objectForKey:@"params"]]; // so silly
        [_facebook dialog:dialog andParams:params andDelegate:self];
    }];
    [self.javascriptBridge registerHandler:@"facebook.setSession" handler:^(id data, WVJBResponse* response) {
        _facebook.accessToken = [data objectForKey:@"accessToken"];
        NSDate* expirationDate = [NSDate dateWithTimeIntervalSince1970:[[data objectForKey:@"expirationDate"] doubleValue]];
        _facebook.expirationDate = expirationDate;
    }];
    [self.javascriptBridge registerHandler:@"facebook.isSessionValid" handler:^(id data, WVJBResponse* response) {
        [response respondWith:[NSDictionary dictionaryWithObject:jsonBool([_facebook isSessionValid]) forKey:@"isValid"]];
    }];
    [self.javascriptBridge registerHandler:@"facebook.extendAccessTokenIfNeeded" handler:^(id data, WVJBResponse* response) {
        [_facebook extendAccessTokenIfNeeded];
    }];
    
    [self.javascriptBridge registerHandler:@"net.request" handler:^(id data, WVJBResponse *response) {
        [self netRequest:data response:response];
    }];
}

    
- (void) netRequest:(NSDictionary *)params response:(WVJBResponse *)response {
    NSDictionary* postParams = [params objectForKey:@"params"];
    NSDictionary* headers = [params objectForKey:@"headers"];
    NSString* method = [params objectForKey:@"method"];
    NSString* url = [self.serverHost stringByAppendingString:[params objectForKey:@"path"]];
    
    UIBackgroundTaskIdentifier bgTaskId = UIBackgroundTaskInvalid;
    bgTaskId = [[UIApplication sharedApplication] beginBackgroundTaskWithExpirationHandler:^{
        [[UIApplication sharedApplication] endBackgroundTask:bgTaskId];
    }];
    
    [BTNet request:url method:method headers:headers params:postParams responseCallback:^(NSError* error, NSDictionary *netResponse) {
        [[UIApplication sharedApplication] endBackgroundTask:bgTaskId];
        if (error) {
            [response respondWithError:error.domain];
        } else {
            NSData* responseData = [netResponse objectForKey:@"responseData"];
            NSDictionary* jsonData = [NSJSONSerialization JSONObjectWithData:responseData options:NSJSONReadingAllowFragments error:nil];
            [response respondWith:jsonData];
        }
    }];
}




// Facebook
/**
 * Called when the user successfully logged in.
 */
@synthesize facebook=_facebook, facebookResponse=_facebookResponse;
- (void)fbDidLogin {
    NSMutableDictionary* facebookSession = [NSMutableDictionary dictionary];
    NSNumber* expirationDate = [NSNumber numberWithDouble:[_facebook.expirationDate timeIntervalSince1970]];
    [facebookSession setObject:_facebook.accessToken forKey:@"accessToken"];
    [facebookSession setObject:expirationDate forKey:@"expirationDate"];
    [_facebookResponse respondWith:facebookSession];
    [self notify:@"facebook.fbDidLogin" info:facebookSession];
}

/**
 * Called when the user dismissed the dialog without logging in.
 */
- (void)fbDidNotLogin:(BOOL)cancelled {
    NSDictionary* info = [NSDictionary dictionaryWithObject:[NSNumber numberWithBool:cancelled] forKey:@"cancelled"];
    [_facebookResponse respondWithError:info];
    [self notify:@"facebook.fbDidNotLogin" info:info];
}

/**
 * Called after the access token was extended. If your application has any
 * references to the previous access token (for example, if your application
 * stores the previous access token in persistent storage), your application
 * should overwrite the old access token with the new one in this method.
 * See extendAccessToken for more details.
 */
- (void)fbDidExtendToken:(NSString *)accessToken expiresAt:(NSDate *)expiresAtDate {
    NSNumber* expiresAt = [NSNumber numberWithInt:[expiresAtDate timeIntervalSince1970]];
    [self notify:@"facebook.fbDidExtendToken" info:[NSDictionary dictionaryWithObjectsAndKeys:
                                                    accessToken, @"accessToken",
                                                    expiresAt, @"expiresAt",
                                                    nil]];
}

/**
 * Called when the user logged out.
 */
- (void)fbDidLogout {
    [self notify:@"facebook.fbDidLogout"];
}

/**
 * Called when the current session has expired. This might happen when:
 *  - the access token expired
 *  - the app has been disabled
 *  - the user revoked the app's permissions
 *  - the user changed his or her password
 */
- (void)fbSessionInvalidated {
    [self notify:@"facebook.fbSessionInvalidated"];
}

/**
 * Called when the dialog succeeds and is about to be dismissed.
 */
- (void)dialogDidComplete:(FBDialog *)dialog {
    [self notify:@"facebook.dialogDidComplete"];
}

/**
 * Called when the dialog succeeds with a returning url.
 */
- (void)dialogCompleteWithUrl:(NSURL *)url {
    NSMutableDictionary *info = [NSMutableDictionary dictionary];
    if (url) { [info setObject:[url absoluteString] forKey:@"url"]; }
    [self notify:@"facebook.dialogCompleteWithUrl" info:info];
}

/**
 * Called when the dialog get canceled by the user.
 */
- (void)dialogDidNotCompleteWithUrl:(NSURL *)url {
    NSMutableDictionary *info = [NSMutableDictionary dictionary];
    if (url) { [info setObject:[url absoluteString] forKey:@"url"]; }
    [self notify:@"facebook.dialogDidNotCompleteWithUrl" info:info];
}

/**
 * Called when the dialog is cancelled and is about to be dismissed.
 */
- (void)dialogDidNotComplete:(FBDialog *)dialog {
    [self notify:@"facebook.dialogDidNotComplete"];
}

/**
 * Called when dialog failed to load due to an error.
 */
- (void)dialog:(FBDialog*)dialog didFailWithError:(NSError *)error {
    [self notify:@"facebook.dialogDidFailWithError"];
}


@end
