//
//  AppDelegate.m
//  dogo
//
//  Created by Marcus Westin on 4/18/12.
//  Copyright (c) 2012. All rights reserved.
//

#import "AppDelegate.h"

@implementation AppDelegate

@synthesize facebook;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
    
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    if ([defaults objectForKey:@"FBAccessTokenKey"] 
        && [defaults objectForKey:@"FBExpirationDateKey"]) {
        facebook.accessToken = [defaults objectForKey:@"FBAccessTokenKey"];
        facebook.expirationDate = [defaults objectForKey:@"FBExpirationDateKey"];
    }
    
    if ([facebook isSessionValid]) {
        NSLog(@"Launched with valid fb session");
    } else {
        NSLog(@"Launched without valid fb session - get one");
        [facebook authorize:nil];
    }
    
    return YES;
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    return [facebook handleOpenURL:url]; 
}

// Facebook login lifecycle

/**
 * Called when the user successfully logged in.
 */
- (void)fbDidLogin {
    NSLog(@"fbDidLogin");
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    [defaults setObject:[facebook accessToken] forKey:@"FBAccessTokenKey"];
    [defaults setObject:[facebook expirationDate] forKey:@"FBExpirationDateKey"];
    [defaults synchronize];
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
