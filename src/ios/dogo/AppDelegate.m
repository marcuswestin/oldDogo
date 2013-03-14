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
#import "BTCamera.h"
#import "BTSql.h"
#import "BTNet.h"

@implementation AppDelegate

- (void)setupModules {
    [BTFiles setup:self];
    [BTTextInput setup:self];
    [BTImage setup:self];
    [BTFacebook setup:self];
    [BTAudio setup:self];
    [BTCache setup:self];
    [BTAddressBook setup:self];
    [BTCamera setup:self];
    [BTSql setup:self];
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
        NSString* protocol = @"http:";
        NSString* port = @"9000";
        NSString* devHostFile = [[NSBundle mainBundle] pathForResource:@"dev-hostname" ofType:@"txt"];
        NSString* host = [NSString stringWithContentsOfFile:devHostFile encoding:NSUTF8StringEncoding error:nil];
        host = [host stringByReplacingOccurrencesOfString:@"\n" withString:@""];
        [WebViewJavascriptBridge enableLogging];
#else
        NSString* protocol = @"https:";
        NSString* port = nil;
        NSString* host = @"dogo.co";
//        [WebViewJavascriptBridge enableLogging];
#endif
        
        [self setServerScheme:protocol host:host port:port];
        
        self.config[@"protocol"] = protocol;
        self.config[@"serverHost"] = self.serverHost;
        self.config[@"serverUrl"] = self.serverUrl;
        self.config[@"device"] = @{ @"systemVersion":[[UIDevice currentDevice] systemVersion],
                                    @"model":[UIDevice currentDevice].model,
                                    @"name":[UIDevice currentDevice].name,
                                    @"platform":[UIDeviceHardware platformString]
                                    };

        [[UIApplication sharedApplication] setStatusBarStyle:UIStatusBarStyleBlackTranslucent animated:YES];
        
        BOOL isDev = [protocol isEqualToString:@"http:"];
        [self setupApp:!isDev];
        [self startApp];
        
        if (isDev) {
            self.window.backgroundColor = [UIColor redColor];
        }
        
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
    
    [self registerHandler:@"message.send" handler:^(id data, BTResponseCallback responseCallback) {
        NSData* payload = [NSData dataWithContentsOfFile:[BTFiles documentPath:data[@"document"]]];
        [self _send:data payload:payload responseCallback:responseCallback];
    }];
    
    [self registerHandler:@"text.send" handler:^(id data, BTResponseCallback responseCallback) {
        [self _send:data payload:nil responseCallback:responseCallback];
    }];
    
    [self registerHandler:@"audio.send" handler:^(id data, BTResponseCallback responseCallback) {
        NSData* audioData = [NSData dataWithContentsOfURL:[NSURL URLWithString:data[@"audioLocation"]]];
        [self _send:data payload:audioData responseCallback:responseCallback];
    }];

    [self registerHandler:@"picture.send" handler:^(id data, BTResponseCallback responseCallback) {
        NSString* base64String = [data[@"base64Data"] stringByReplacingOccurrencesOfString:@"data:image/jpeg;base64," withString:@""];
        
        NSData* pictureData = [NSData dataWithBase64EncodedString:base64String];
        UIImage* image = [UIImage imageWithData:pictureData];
        NSMutableDictionary* params = [NSMutableDictionary dictionaryWithDictionary:[data objectForKey:@"params"]];
        params[@"width"] = [NSNumber numberWithFloat:image.size.width];
        params[@"height"] = [NSNumber numberWithFloat:image.size.height];
        id _data = [NSMutableDictionary dictionaryWithDictionary:data];
        _data[@"params"] = params;
        [self _send:_data payload:pictureData responseCallback:responseCallback];
    }];
}

- (void)_send:(NSDictionary*)data payload:(NSData*)payload responseCallback:(BTResponseCallback)responseCallback {
    NSString* url = data[@"url"];
    NSDictionary* headers = data[@"headers"];
    NSDictionary* params = data[@"params"];
    NSString* boundary = data[@"boundary"];
    NSDictionary* attachments = nil;
    if (payload) {
        attachments = @{ @"payload":payload };
    }
    [BTNet post:url json:params attachments:attachments headers:headers boundary:boundary responseCallback:responseCallback];
}

@end
