//
//  AppDelegate.h
//  dogo
//
//  Created by Marcus Westin on 4/18/12.
//  Copyright (c) 2012. All rights reserved.
//

#import "BTAppDelegate.h"
#import "FBConnect.h"
#import "State.h"
#import "Net.h"

@interface AppDelegate : BTAppDelegate <FBSessionDelegate>

@property (nonatomic, retain) Facebook *facebook;
@property (nonatomic, copy) ResponseCallback facebookConnectResponseCallback;
@property (atomic, strong) State* state;
@property (atomic, strong) Net* net;

@end
