//
//  AppDelegate.m
//  dogo
//
//  Created by Marcus Westin on 4/18/12.
//  Copyright (c) 2012. All rights reserved.
//

#import "AppDelegate.h"

@implementation AppDelegate

@synthesize facebook, facebookConnectResponseCallback, state, net;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {
//        self.serverHost = @"http://marcus.local:9000";
        self.serverHost = @"http://api.dogoapp.com";
        state = [[State alloc] init];
        net = [[Net alloc] init];
        
        facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
        NSDictionary* facebookSession = [state get:@"facebookSession"];
        if (facebookSession) {
            facebook.accessToken = [facebookSession objectForKey:@"accessToken"];
            NSNumber* expirationDate = [facebookSession objectForKey:@"expirationToken"];
            facebook.expirationDate = [NSDate dateWithTimeIntervalSince1970:[expirationDate doubleValue]];
        }
        
        [[self.webView scrollView] setBounces:NO];
        self.webView.dataDetectorTypes = UIDataDetectorTypeNone;
        
        [self loadCurrentVersionApp];
//        [self requestUpgrade];

        return YES;
    } else {
        return NO;
    }
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    return [facebook handleOpenURL:url]; 
}



// Commands

- (void)handleCommand:(NSString *)command data:(id)data responseCallback:(ResponseCallback)responseCallback {
    if ([command isEqualToString:@"facebook.connect"]) {
        self.facebookConnectResponseCallback = responseCallback;
        [facebook authorize:nil];
    } else if ([command isEqualToString:@"state.load"]) {
        responseCallback(nil, [state load]);
    } else if ([command isEqualToString:@"state.set"]) {
        [state set:[data objectForKey:@"key"] value:[data objectForKey:@"value"]];
        responseCallback(nil, nil);
    } else if ([command isEqualToString:@"state.reset"]) {
        [state reset];
    } else if ([command isEqualToString:@"api.request"]) {
        [net request:data responseCallback:responseCallback];
    } else if ([command isEqualToString:@"console.log"]) {
        NSLog(@"console.log %@", data);
    }
}



// Facebook
/**
 * Called when the user successfully logged in.
 */
- (void)fbDidLogin {
    NSLog(@"fbDidLogin");
    NSMutableDictionary* facebookSession = [NSMutableDictionary dictionary];
    NSNumber* expirationDate = [NSNumber numberWithDouble:[facebook.expirationDate timeIntervalSince1970]];
    [facebookSession setObject:facebook.accessToken forKey:@"accessToken"];
    [facebookSession setObject:expirationDate forKey:@"expirationKey"];
    [state set:@"facebookSession" value:facebookSession];
    self.facebookConnectResponseCallback(nil, facebookSession);
}

/**
 * Called when the user dismissed the dialog without logging in.
 */
- (void)fbDidNotLogin:(BOOL)cancelled {
    NSLog(@"fbDidNotLogin");
}

/**
 * Called after the access token was extended. If your application has any
 * references to the previous access token (for example, if your application
 * stores the previous access token in persistent storage), your application
 * should overwrite the old access token with the new one in this method.
 * See extendAccessToken for more details.
 */
- (void)fbDidExtendToken:(NSString *)accessToken expiresAt:(NSDate *)expiresAt {
    NSLog(@"fbDidExtendToken");
}

/**
 * Called when the user logged out.
 */
- (void)fbDidLogout {
    NSLog(@"fbDidLogout");
}

/**
 * Called when the current session has expired. This might happen when:
 *  - the access token expired
 *  - the app has been disabled
 *  - the user revoked the app's permissions
 *  - the user changed his or her password
 */
- (void)fbSessionInvalidated {
    NSLog(@"fbSessionInvalidated");
}

@end
