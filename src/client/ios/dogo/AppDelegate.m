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

@synthesize facebook, facebookCallback, textInput;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {

        NSString* mode = @"dev";
#ifdef TESTFLIGHT
        mode = @"testflight";
#endif
#ifdef APPSTORE
        mode = @"appstore";  
#endif
        
        [self.config setValue:mode forKey:@"mode"];
        
        BOOL devMode = [mode isEqualToString:@"dev"];
        
        self.serverHost = devMode ? @"http://marcus.local:9000" : @"http://api.dogoapp.com";

        facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
        
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
        self.facebookCallback = responseCallback;
        [facebook authorize:[data objectForKey:@"permissions"]];
    } else if ([command isEqualToString:@"facebook.dialog"]) {
        NSString* dialog = [data objectForKey:@"dialog"]; // oauth, feed, and apprequests
        NSMutableDictionary* params = [NSMutableDictionary dictionaryWithDictionary:[data objectForKey:@"params"]]; // so silly
        [self.facebook dialog:dialog andParams:params andDelegate:self];
    } else if ([command isEqualToString:@"facebook.setSession"]) {
        facebook.accessToken = [data objectForKey:@"accessToken"];
        NSDate* expirationDate = [NSDate dateWithTimeIntervalSince1970:[[data objectForKey:@"expirationDate"] doubleValue]];
        facebook.expirationDate = expirationDate;
    } else if ([command isEqualToString:@"facebook.isSessionValid"]) {
        responseCallback(nil, [NSDictionary dictionaryWithObject:jsonBool([facebook isSessionValid]) forKey:@"isValid"]);
    } else if ([command isEqualToString:@"facebook.extendAccessTokenIfNeeded"]) {
        [self.facebook extendAccessTokenIfNeeded];
    } else if ([command isEqualToString:@"composer.showTextInput"]) {
        [self showTextInput:data];
    } else if ([command isEqualToString:@"composer.hideTextInput"]) {
        [textInput resignFirstResponder];
        [textInput removeFromSuperview];
    } else {
        NSLog(@"WARNING ObjC Got unknown command: %@ %@", command, data);
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
    NSMutableDictionary* facebookSession = [NSMutableDictionary dictionary];
    NSNumber* expirationDate = [NSNumber numberWithDouble:[facebook.expirationDate timeIntervalSince1970]];
    [facebookSession setObject:facebook.accessToken forKey:@"accessToken"];
    [facebookSession setObject:expirationDate forKey:@"expirationDate"];
    self.facebookCallback(nil, facebookSession);
    [self notify:@"facebook.fbDidLogin" info:facebookSession];
}

/**
 * Called when the user dismissed the dialog without logging in.
 */
- (void)fbDidNotLogin:(BOOL)cancelled {
    [self notify:@"facebook.fbDidNotLogin" info:[NSDictionary dictionaryWithObject:[NSNumber numberWithBool:cancelled] forKey:@"cancelled"]];
}

/**
 * Called after the access token was extended. If your application has any
 * references to the previous access token (for example, if your application
 * stores the previous access token in persistent storage), your application
 * should overwrite the old access token with the new one in this method.
 * See extendAccessToken for more details.
 */
- (void)fbDidExtendToken:(NSString *)accessToken expiresAt:(NSDate *)expiresAt {
    [self notify:@"facebook.fbDidExtendToken" info:[NSDictionary dictionaryWithObjectsAndKeys:
                                                    accessToken, @"accessToken",
                                                    [expiresAt timeIntervalSince1970], @"expiresAt",
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
    if (url) { [info setObject:[url absoluteURL] forKey:@"url"]; }
    [self notify:@"facebook.dialogCompleteWithUrl" info:info];
}

/**
 * Called when the dialog get canceled by the user.
 */
- (void)dialogDidNotCompleteWithUrl:(NSURL *)url {
    NSMutableDictionary *info = [NSMutableDictionary dictionary];
    if (url) { [info setObject:[url absoluteURL] forKey:@"url"]; }
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
