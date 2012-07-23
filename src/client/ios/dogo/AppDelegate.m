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
        [self.config setValue:[self getCurrentVersion] forKey:@"currentVersion"];
        
        BOOL devMode = [mode isEqualToString:@"dev"];
        
        self.serverHost = devMode ? @"http://marcus.local:9000" : @"http://api.dogoapp.com";

        facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
        
        [[self.webView scrollView] setBounces:NO];
        self.webView.dataDetectorTypes = UIDataDetectorTypeNone;
        
        [self startApp:devMode];
        
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
    } else if ([command isEqualToString:@"textInput.show"]) {
        [self showTextInput:data];
    } else if ([command isEqualToString:@"textInput.hide"]) {
        [self hideTextInput];
    } else if ([command isEqualToString:@"textInput.animate"]) {
        [self animateTextInput:data];
    } else if ([command isEqualToString:@"textInput.set"]) {
        if (textInput) { textInput.text = [data objectForKey:@"text"]; }
    } else {
        NSLog(@"WARNING ObjC Got unknown command: %@ %@", command, data);
    }
}


- (void)showTextInput:(NSDictionary *)params {
    if (textInput) { [self hideTextInput]; }
    textInput = [[UITextView alloc] initWithFrame:[self rectFromDict:[params objectForKey:@"at"]]];
    
    textInput.font = [UIFont systemFontOfSize:17];
    
    textInput.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    textInput.layer.borderWidth = 1.0;
    textInput.layer.borderColor = [[UIColor grayColor] CGColor];
    textInput.layer.cornerRadius = 0.0;
    textInput.backgroundColor = [UIColor whiteColor];
    textInput.clipsToBounds = YES;
    textInput.scrollEnabled = NO;
    textInput.keyboardType = UIKeyboardTypeDefault;
    textInput.delegate = self;
    
    UIReturnKeyType returnKeyType = [self returnKeyTypeFromDict:params];
    if (returnKeyType) {
        textInput.returnKeyType = returnKeyType;
    }
    
    textInput.text = @"";
    [self sizeTextInput];
    [self.webView addSubview:textInput];
    [textInput becomeFirstResponder];
}

- (void)hideTextInput {
    if (!textInput) { return; }
    [textInput resignFirstResponder];
    [textInput removeFromSuperview];
    textInput = nil;
}

- (void)sizeTextInput {
    CGRect frame = textInput.frame;
    frame.size.height = textInput.contentSize.height;
    int dHeight = textInput.frame.size.height - frame.size.height;
    frame.origin.y += dHeight;
    textInput.frame = frame;
}

- (void)textViewDidChange:(UITextView *)textView {
    [self sizeTextInput];
    [self notify:@"textInput.didChange" info:[NSDictionary dictionaryWithObjectsAndKeys:
                                              self.textInput.text, @"text",
                                              nil]];
}

- (UIReturnKeyType)returnKeyTypeFromDict:(NSDictionary *)params {
    NSString* returnKeyType = [params objectForKey:@"returnKeyType"];
    if ([returnKeyType isEqualToString:@"Done"]) { return UIReturnKeyDone; }
    if ([returnKeyType isEqualToString:@"EmergencyCall"]) { return UIReturnKeyEmergencyCall; }
    if ([returnKeyType isEqualToString:@"Go"]) { return UIReturnKeyGo; }
    if ([returnKeyType isEqualToString:@"Google"]) { return UIReturnKeyGoogle; }
    if ([returnKeyType isEqualToString:@"Join"]) { return UIReturnKeyJoin; }
    if ([returnKeyType isEqualToString:@"Next"]) { return UIReturnKeyNext; }
    if ([returnKeyType isEqualToString:@"Route"]) { return UIReturnKeyRoute; }
    if ([returnKeyType isEqualToString:@"Search"]) { return UIReturnKeySearch; }
    if ([returnKeyType isEqualToString:@"Send"]) { return UIReturnKeySend; }
    return UIReturnKeyDefault;
}

- (CGRect)rectFromDict:(NSDictionary *)params {
    CGRect frame;
    if (textInput) {
        frame = textInput.frame;
    } else {
        frame = CGRectMake(0, 0, 0, 0);
    }
    if ([params objectForKey:@"x"]) {
        frame.origin.x = [[params objectForKey:@"x"] doubleValue];
    }
    if ([params objectForKey:@"y"]) {
        frame.origin.y = [[params objectForKey:@"y"] doubleValue];
    }
    if ([params objectForKey:@"width"]) {
        frame.size.width = [[params objectForKey:@"width"] doubleValue];
    }
    if ([params objectForKey:@"height"]) {
        frame.size.height = [[params objectForKey:@"height"] doubleValue];
    }
    return frame;
}

- (BOOL)textView:(UITextView *)textView shouldChangeTextInRange:(NSRange)range replacementText:(NSString *)text {
    if([text isEqualToString:@"\n"]) {
        [self notify:@"textInput.return" info:[NSDictionary dictionaryWithObject:textInput.text forKey:@"text"]];
        return NO;
    }
    return YES;
}

- (void)textViewDidEndEditing:(UITextView *)textView {
    [self notify:@"textInput.didEndEditing"];
}

- (void)animateTextInput:(NSDictionary *)params {
    if (!textInput) { return; }
    NSNumber* duration = [params objectForKey:@"duration"];
    [UIView animateWithDuration:[duration doubleValue] animations:^{
        textInput.frame = [self rectFromDict:[params objectForKey:@"to"]];
        [self sizeTextInput];
    }];
     if ([params objectForKey:@"blur"]) {
         [textInput resignFirstResponder];
     }
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
