#import "AppDelegate.h"
#import <QuartzCore/QuartzCore.h>
#import "UIDeviceHardware.h"

@implementation AppDelegate

@synthesize facebook, facebookCallback, textInput, textInputParams;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    if ([super application:application didFinishLaunchingWithOptions:launchOptions]) {

        NSString* mode = @"dev";
#ifdef TESTFLIGHT
        mode = @"testflight";
#endif
#ifdef APPSTORE
        mode = @"appstore";  
#endif
        
        NSDictionary* device = [NSDictionary dictionaryWithObjectsAndKeys:
                                [[UIDevice currentDevice] systemVersion], @"systemVersion",
                                [UIDevice currentDevice].model, @"model",
                                [UIDevice currentDevice].name, @"name",
                                [UIDeviceHardware platformString], @"platform",
                                nil];
        
        BOOL devMode = [mode isEqualToString:@"dev"];
        self.serverHost = devMode ? @"http://localhost:9000" : @"https://dogoapp.com";

        [self.config setValue:mode forKey:@"mode"];
        [self.config setValue:[self getCurrentVersion] forKey:@"currentVersion"];
        [self.config setValue:device forKey:@"device"];
        [self.config setValue:self.serverHost forKey:@"serverUrl"];
        
        facebook = [[Facebook alloc] initWithAppId:@"219049001532833" andDelegate:self];
        
        [[self.webView scrollView] setBounces:NO];
        self.webView.dataDetectorTypes = UIDataDetectorTypeNone;
        
        [self startApp:devMode];
        
        return YES;
    } else {
        return NO;
    }
}

- (void)keyboardWillShow:(NSNotification *)notification {
    [super keyboardWillShow:notification];
    if ([textInputParams objectForKey:@"shiftWebview"]) {
        [self shiftWebviewWithKeyboard:notification];
    }
}

- (void)keyboardWillHide:(NSNotification *)notification {
    [super keyboardWillHide:notification];
    if ([textInputParams objectForKey:@"shiftWebview"]) {
        [self shiftWebviewWithKeyboard:notification];
    }
}

- (void)shiftWebviewWithKeyboard:(NSNotification *)notification {
    NSDictionary* userInfo = [notification userInfo];
    NSTimeInterval animationDuration;
    CGRect begin;
    CGRect end;
    [[userInfo objectForKey:UIKeyboardAnimationDurationUserInfoKey] getValue:&animationDuration];
    [[userInfo objectForKey:UIKeyboardFrameBeginUserInfoKey] getValue:&begin];
    [[userInfo objectForKey:UIKeyboardFrameEndUserInfoKey] getValue:&end];
    [UIView animateWithDuration:animationDuration animations:^{
        CGRect frame = self.webView.frame;
        self.webView.frame = CGRectMake(frame.origin.x, frame.origin.y-(begin.origin.y-end.origin.y), frame.size.width, frame.size.height);
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
    } else if ([command isEqualToString:@"net.request"]) {
        [self netRequest:data responseCallback:responseCallback];
    } else {
        NSLog(@"WARNING ObjC Got unknown command: %@ %@", command, data);
    }
}


- (void) netRequest:(NSDictionary *)params responseCallback:(ResponseCallback)responseCallback {
    NSDictionary* postParams = [params objectForKey:@"params"];
    NSDictionary* headers = [params objectForKey:@"headers"];
    NSString* method = [params objectForKey:@"method"];
    NSString* url = [self.serverHost stringByAppendingString:[params objectForKey:@"path"]];
    
    UIBackgroundTaskIdentifier bgTaskId = UIBackgroundTaskInvalid;
    bgTaskId = [[UIApplication sharedApplication] beginBackgroundTaskWithExpirationHandler:^{
        [[UIApplication sharedApplication] endBackgroundTask:bgTaskId];
    }];
    
    [BTNet request:url method:method headers:headers params:postParams responseCallback:^(NSError* error, NSDictionary *response) {
        [[UIApplication sharedApplication] endBackgroundTask:bgTaskId];
        if (error) {
            responseCallback(error.domain, nil);
        } else {
            NSData* responseData = [response objectForKey:@"responseData"];
            NSDictionary* jsonData = [NSJSONSerialization JSONObjectWithData:responseData options:NSJSONReadingAllowFragments error:nil];
            responseCallback(nil, jsonData);
        }
        if (responseCallback) {
            responseCallback(nil, nil);
        }
    }];
}


- (void)showTextInput:(NSDictionary *)params {
    if (textInput) { [self hideTextInput]; }
    textInput = [[UITextView alloc] initWithFrame:[self rectFromDict:[params objectForKey:@"at"]]];
    textInputParams = params;
    
    textInput.font = [UIFont systemFontOfSize:17];
    
    textInput.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    textInput.clipsToBounds = YES;
    textInput.scrollEnabled = NO;
    textInput.keyboardType = UIKeyboardTypeDefault;
    textInput.delegate = self;
    
    UIReturnKeyType returnKeyType = [self returnKeyTypeFromDict:params];
    if (returnKeyType) {
        textInput.returnKeyType = returnKeyType;
    }
    
    NSDictionary* font = [params objectForKey:@"font"];
    if (font) {
        NSNumber* size = [font objectForKey:@"size"];
        [textInput setFont:[UIFont fontWithName:[font objectForKey:@"name"] size:[size floatValue]]];
    }
    
    NSString* backgroundImage = [params objectForKey:@"backgroundImage"];
    if (backgroundImage) {
        textInput.backgroundColor = [UIColor colorWithPatternImage:[UIImage imageNamed:backgroundImage]];
    }
    if ([params objectForKey:@"backgroundColor"]) {
        textInput.backgroundColor = [self colorFromParam:[params objectForKey:@"backgroundColor"]];
    }
    if ([params objectForKey:@"borderColor"]) {
        textInput.layer.borderColor = [[self colorFromParam:[params objectForKey:@"borderColor"]] CGColor];
        textInput.layer.borderWidth = 1.0;
    }
    if ([params objectForKey:@"cornerRadius"]) {
        NSNumber* cornerRadius = [params objectForKey:@"cornerRadius"];
        [textInput.layer setCornerRadius:[cornerRadius floatValue]];
    }
    if ([params objectForKey:@"contentInset"]) {
        textInput.contentInset = [self insetsFromParam:[params objectForKey:@"contentInset"]];
    }
    
    textInput.text = @"";
    [self sizeTextInput];
    [self.webView addSubview:textInput];
    [textInput becomeFirstResponder];
}

- (UIEdgeInsets)insetsFromParam:(NSArray *)param {
    NSNumber* n1 = [param objectAtIndex:0];
    NSNumber* n2 = [param objectAtIndex:1];
    NSNumber* n3 = [param objectAtIndex:2];
    NSNumber* n4 = [param objectAtIndex:3];
    return UIEdgeInsetsMake([n1 floatValue], [n2 floatValue], [n3 floatValue], [n4 floatValue]);
}

- (UIColor *)colorFromParam:(NSArray *)param {
    NSNumber* red = [param objectAtIndex:0];
    NSNumber* green = [param objectAtIndex:1];
    NSNumber* blue = [param objectAtIndex:2];
    NSNumber* alpha = [param objectAtIndex:3];
    return [UIColor colorWithRed:[red floatValue] green:[green floatValue] blue:[blue floatValue] alpha:[alpha floatValue]];
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
    if (dHeight != 0) {
        frame.origin.y += dHeight;
        textInput.frame = frame;
        NSDictionary* info = [NSDictionary dictionaryWithObjectsAndKeys:
                             [NSNumber numberWithInt:dHeight], @"heightChange",
                             [NSNumber numberWithFloat:textInput.frame.size.height], @"height",
                             nil];
        [self notify:@"textInput.changedHeight" info:info];
    }
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
