//
//  AppDelegate.m
//  dogo
//
//  Created by Marcus Westin on 4/18/12.
//  Copyright (c) 2012. All rights reserved.
//

#import "AppDelegate.h"
#import <QuartzCore/QuartzCore.h>

@implementation AppDelegate

@synthesize facebook, facebookConnectResponseCallback, net, textInput;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {

        // Set as environment variable in schema
//        NSString* mode = @"dev";
        NSString* mode = @"testflight";
//        NSString* mode = @"appstore";
        
        [self.config setValue:mode forKey:@"mode"];
        
        BOOL devMode = [mode isEqualToString:@"dev"];
        
        self.serverHost = devMode ? @"http://marcus.local:9000" : @"http://api.dogoapp.com";

        net = [[Net alloc] init];
        
        facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
        NSDictionary* facebookSession = [self.state get:@"facebookSession"];
        if (facebookSession) {
            facebook.accessToken = [facebookSession objectForKey:@"accessToken"];
            NSNumber* expirationDate = [facebookSession objectForKey:@"expirationToken"];
            facebook.expirationDate = [NSDate dateWithTimeIntervalSince1970:[expirationDate doubleValue]];
        }
        
        [[self.webView scrollView] setBounces:NO];
        self.webView.dataDetectorTypes = UIDataDetectorTypeNone;
        
        [self startApp:devMode];
//        [self requestUpgrade];
        
        return YES;
    } else {
        return NO;
    }
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    return [facebook handleOpenURL:url]; 
}

+ (AppDelegate *)instance {
    return (AppDelegate*) [UIApplication sharedApplication];
}


// Commands

- (void)handleCommand:(NSString *)command data:(id)data responseCallback:(ResponseCallback)responseCallback {
    if ([command isEqualToString:@"facebook.connect"]) {
        self.facebookConnectResponseCallback = responseCallback;
        [facebook authorize:nil];
    } else if ([command isEqualToString:@"api.request"]) {
        [net request:data responseCallback:responseCallback];
    } else if ([command isEqualToString:@"composer.showTextInput"]) {
        [self showTextInput:data];
    } else if ([command isEqualToString:@"composer.hideTextInput"]) {
        [textInput removeFromSuperview];
    }
}



// Composer
- (void)showTextInput:(NSDictionary *)params {
    float x = [[params objectForKey:@"x"] doubleValue];
    float y = [[params objectForKey:@"y"] doubleValue];
    float width = [[params objectForKey:@"width"] doubleValue];
    float height = [[params objectForKey:@"height"] doubleValue];
    textInput = [[UITextView alloc] initWithFrame:CGRectMake(x, y, width, height)];
    
    UITextView* textField = textInput;
    textField.font = [UIFont systemFontOfSize:15];
    
    textField.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    textField.layer.borderWidth = 1.0;
    textField.layer.borderColor = [[UIColor grayColor] CGColor];
    textField.layer.cornerRadius = 0.0;
    textField.backgroundColor = [UIColor whiteColor];
    textField.clipsToBounds = YES;
    textField.keyboardType = UIKeyboardTypeDefault;
    textField.returnKeyType = UIReturnKeySend;
    textField.delegate = self;
    [self.window addSubview:textInput];

    [textField becomeFirstResponder];
}

- (BOOL)textView:(UITextView *)textView shouldChangeTextInRange:(NSRange)range replacementText:(NSString *)text {
    if([text isEqualToString:@"\n"]) {
        [self notify:@"composer.sendText" info:[NSDictionary dictionaryWithObject:textInput.text forKey:@"text"]];
        textInput.text = @"";
        return NO;
    }
    return YES;
}

- (void)textViewDidEndEditing:(UITextView *)textView {
    [textInput removeFromSuperview];
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
    [self.state set:@"facebookSession" value:facebookSession];
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
