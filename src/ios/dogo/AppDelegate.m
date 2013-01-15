#import "AppDelegate.h"
#import "UIDeviceHardware.h"
#import "BTTextInput.h"
#import "BTImage.h"
#import "BTFacebook.h"

@implementation AppDelegate

- (void)setupModules {
    [BTTextInput setup:self];
    [BTImage setup:self];
    [BTFacebook setup:self];
}
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    // TODO THe module should be able to automaticlally access this behavior
    return [BTFacebook handleOpenURL:url];
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {
        
//#define DEV
#ifdef DEV
        NSString* scheme = @"http:";
        NSString* port = @"9000";
        NSString* devHostFile = [[NSBundle mainBundle] pathForResource:@"dev-hostname" ofType:@"txt"];
        NSString* host = [NSString stringWithContentsOfFile:devHostFile encoding:NSUTF8StringEncoding error:nil];
        host = [host stringByReplacingOccurrencesOfString:@"\n" withString:@""];
        [WebViewJavascriptBridge enableLogging];
#else
        NSString* scheme = @"https:";
        NSString* port = nil;
        NSString* host = @"dogoapp.com";
//        [WebViewJavascriptBridge enableLogging];
#endif
        
        NSDictionary* device = [NSDictionary dictionaryWithObjectsAndKeys:
                                [[UIDevice currentDevice] systemVersion], @"systemVersion",
                                [UIDevice currentDevice].model, @"model",
                                [UIDevice currentDevice].name, @"name",
                                [UIDeviceHardware platformString], @"platform",
                                nil];
        
        [self setServerScheme:scheme host:host port:port];
        
        [self.config setValue:[self getCurrentVersion] forKey:@"currentVersion"];
        [self.config setValue:device forKey:@"device"];
        [self.config setValue:self.serverHost forKey:@"serverHost"];
        [self.config setValue:self.serverUrl forKey:@"serverUrl"];

        [[UIApplication sharedApplication] setStatusBarStyle:UIStatusBarStyleBlackTranslucent];
        
        BOOL isDev = [scheme isEqualToString:@"http:"];
        [self setupApp:!isDev];
        [self startApp];
        
        return YES;
    } else {
        return NO;
    }
}

- (void)setupNetHandlers {
    [super setupNetHandlers];

    NSString* graphicsPrefix = @"/graphics/";
    [WebViewProxy handleRequestsWithHost:self.serverHost pathPrefix:graphicsPrefix handler:^(NSURLRequest *req, WVPResponse *res) {
        NSString* path = [req.URL.path substringFromIndex:graphicsPrefix.length];
        NSData* data = [NSData dataWithContentsOfFile:[[NSBundle mainBundle] pathForResource:path ofType:nil]];
        [res respondWithData:data mimeType:nil];
    }];
    
    [WebViewProxy handleRequestsWithHost:self.serverHost pathPrefix:@"/fonts/" handler:^(NSURLRequest* req, WVPResponse *res) {
        NSString* path = [req.URL.path substringFromIndex:1];
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

+ (AppDelegate *)instance {
    return (AppDelegate*) [UIApplication sharedApplication];
}


// Commands
- (void)setupBridgeHandlers {
    [super setupBridgeHandlers];
    [self registerHandler:@"net.request" handler:^(id data, BTResponseCallback responseCallback) {
        [self netRequest:data response:[BTResponse responseWithCallback:responseCallback]];
    }];
}

    
- (void) netRequest:(NSDictionary *)params response:(BTResponse*)response {
    NSDictionary* postParams = [params objectForKey:@"params"];
    NSDictionary* headers = [params objectForKey:@"headers"];
    NSString* method = [params objectForKey:@"method"];
    NSString* url = [self.serverUrl stringByAppendingString:[params objectForKey:@"path"]];
    
    UIBackgroundTaskIdentifier bgTaskId = UIBackgroundTaskInvalid;
    bgTaskId = [[UIApplication sharedApplication] beginBackgroundTaskWithExpirationHandler:^{
        [[UIApplication sharedApplication] endBackgroundTask:bgTaskId];
    }];
    
    [BTNet request:url method:method headers:headers params:postParams responseCallback:^(NSError* error, NSData *netData) {
        [[UIApplication sharedApplication] endBackgroundTask:bgTaskId];
        if (error) {
            NSLog(@"ERROR %@ %@ %@ %@ %@", error, url, method, headers, postParams);
            [response respondWithError:@"Could not complete request"];
        } else {
            NSDictionary* jsonData;
            if (netData && netData.length) {
                jsonData = [NSJSONSerialization JSONObjectWithData:netData options:NSJSONReadingAllowFragments error:nil];
            }
            [response respondWith:jsonData];
        }
    }];
}

@end
