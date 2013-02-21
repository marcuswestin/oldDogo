#import "AppDelegate.h"
#import "UIDeviceHardware.h"
#import "BTTextInput.h"
#import "BTImage.h"
#import "BTFacebook.h"
#import "BTAudio.h"
#import "BTFiles.h"
#import "Base64.h"
#import "BTCache.h"
#import "BTAddressBook.h"

@implementation AppDelegate

- (void)setupModules {
    [BTFiles setup:self];
    [BTTextInput setup:self];
    [BTImage setup:self];
    [BTFacebook setup:self];
    [BTAudio setup:self];
    [BTCache setup:self];
    [BTAddressBook setup:self];
}
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    if ([BTFacebook handleOpenURL:url]) { return YES; }
    NSLog(@"application openUrl %@ %@", url, url.scheme);
    if ([url.scheme isEqualToString:@"dogo"]) {
        NSDictionary* info = [NSDictionary dictionaryWithObjectsAndKeys:
                              url.absoluteString, @"url",
                              sourceApplication, @"sourceApplication",
                              nil];
        [self notify:@"app.didOpenUrl" info:info];
        return YES;
    }
    return NO;
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {
        
#define DEV
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
        NSString* host = @"dogo.co";
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

        [[UIApplication sharedApplication] setStatusBarStyle:UIStatusBarStyleBlackTranslucent animated:YES];
        
        BOOL isDev = [scheme isEqualToString:@"http:"];
        [self setupApp:!isDev];
        [self startApp];
        
        return YES;
    } else {
        return NO;
    }
}

- (void)setupNetHandlers:(BOOL)useLocalBuild {
    [super setupNetHandlers:useLocalBuild];
    
    if (useLocalBuild) {
        NSString* graphicsPrefix = @"/graphics/";
        [WebViewProxy handleRequestsWithHost:self.serverHost pathPrefix:graphicsPrefix handler:^(NSURLRequest *req, WVPResponse *res) {
            NSString* path = [req.URL.path substringFromIndex:graphicsPrefix.length];
            NSData* data = [NSData dataWithContentsOfFile:[[NSBundle mainBundle] pathForResource:path ofType:nil]];
            [res respondWithData:data mimeType:nil];
        }];
    }
    
//    [WebViewProxy handleRequestsWithHost:self.serverHost pathPrefix:@"/fonts/" handler:^(NSURLRequest* req, WVPResponse *res) {
//        NSString* path = [req.URL.path substringFromIndex:1];
//        NSData* data = [NSData dataWithContentsOfFile:[[NSBundle mainBundle] pathForResource:path ofType:nil]];
//        [res respondWithData:data mimeType:nil];
//    }];
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
- (void)setupBridgeHandlers:(BOOL)useLocalBuild {
    [super setupBridgeHandlers:useLocalBuild];
    [self registerHandler:@"net.request" handler:^(id data, BTResponseCallback responseCallback) {
        [BTNet request:data responseCallback:responseCallback];
    }];
    
    [self registerHandler:@"text.send" handler:^(id data, BTResponseCallback responseCallback) {
        [self _send:data payload:nil responseCallback:responseCallback];
    }];
    
    [self registerHandler:@"audio.send" handler:^(id data, BTResponseCallback responseCallback) {
        NSData* audioData = [NSData dataWithContentsOfURL:[NSURL URLWithString:[data objectForKey:@"audioLocation"]]];
        [self _send:data payload:audioData responseCallback:responseCallback];
    }];

    [self registerHandler:@"picture.send" handler:^(id data, BTResponseCallback responseCallback) {
        NSString* base64String = [[data objectForKey:@"base64Data"] stringByReplacingOccurrencesOfString:@"data:image/jpeg;base64," withString:@""];
        
        NSData* pictureData = [NSData dataWithBase64EncodedString:base64String];
        UIImage* image = [UIImage imageWithData:pictureData];
        NSMutableDictionary* params = [NSMutableDictionary dictionaryWithDictionary:[data objectForKey:@"params"]];
        [params setObject:[NSNumber numberWithFloat:image.size.width] forKey:@"width"];
        [params setObject:[NSNumber numberWithFloat:image.size.height] forKey:@"height"];
        id _data = [NSMutableDictionary dictionaryWithDictionary:data];
        [_data setObject:params forKey:@"params"];
        [self _send:_data payload:pictureData responseCallback:responseCallback];
    }];
}

- (void)_send:(NSDictionary*)data payload:(NSData*)payload responseCallback:(BTResponseCallback)responseCallback {
    NSString* url = [data objectForKey:@"url"];
    NSDictionary* headers = [data objectForKey:@"headers"];
    NSDictionary* params = [data objectForKey:@"params"];
    NSString* boundary = [data objectForKey:@"boundary"];
    NSDictionary* attachments = nil;
    if (payload) {
        attachments = [NSDictionary dictionaryWithObject:payload forKey:@"payload"];
    }
    [BTNet post:url json:params attachments:attachments headers:headers boundary:boundary responseCallback:responseCallback];
}

@end
