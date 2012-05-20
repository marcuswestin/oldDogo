//
//  AppDelegate.h
//  dogo
//
//  Created by Marcus Westin on 4/18/12.
//  Copyright (c) 2012. All rights reserved.
//

#import "BTAppDelegate.h"
#import "FBConnect.h"

@interface AppDelegate : BTAppDelegate <FBSessionDelegate, FBDialogDelegate, UITextViewDelegate>

@property (nonatomic, retain) Facebook *facebook;
@property (nonatomic, copy) ResponseCallback facebookCallback;

+ (AppDelegate*) instance;

@property (atomic, strong) UITextView* textInput;
- (void) showTextInput:(NSDictionary*) params;

@end
