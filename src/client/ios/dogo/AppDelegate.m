//
//  AppDelegate.m
//  dogo
//
//  Created by Marcus Westin on 4/18/12.
//  Copyright (c) 2012. All rights reserved.
//

#import "AppDelegate.h"

@implementation AppDelegate

@synthesize facebook, facebookConnectResponseCallback;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {
        facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
        return YES;
    } else {
        return NO;
    }
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    return [facebook handleOpenURL:url]; 
}

// Commands

- (void)handleCommand:(NSString *)command data:(NSDictionary *)data responseCallback:(ResponseCallback)responseCallback {
    if ([command isEqualToString:@"facebook_connect"]) {
        self.facebookConnectResponseCallback = responseCallback;
        [self fbLogin];
    } else if ([command isEqualToString:@"console.log"]) {
        NSLog(@"console.log %@", data);
    }
}


// Facebook login lifecycle

- (void) fbLogin {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    if ([defaults objectForKey:@"FBAccessTokenKey"] 
        && [defaults objectForKey:@"FBExpirationDateKey"]) {
        facebook.accessToken = [defaults objectForKey:@"FBAccessTokenKey"];
        facebook.expirationDate = [defaults objectForKey:@"FBExpirationDateKey"];
    }
    
    if ([facebook isSessionValid]) {
        self.facebookConnectResponseCallback(nil, nil);
    } else {
        NSLog(@"Launched without valid fb session - get one");
        [facebook authorize:nil];
    }
}

/**
 * Called when the user successfully logged in.
 */
- (void)fbDidLogin {
    NSLog(@"fbDidLogin");
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    [defaults setObject:[facebook accessToken] forKey:@"FBAccessTokenKey"];
    [defaults setObject:[facebook expirationDate] forKey:@"FBExpirationDateKey"];
    [defaults synchronize];
    
    self.facebookConnectResponseCallback(nil, nil);
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
