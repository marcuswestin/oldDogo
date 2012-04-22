//
//  State.m
//  dogo
//
//  Created by Marcus Westin on 4/21/12.
//  Copyright (c) 2012 Meebo. All rights reserved.
//

#import "State.h"

static NSString* STATE_KEY = @"dogo.state";

@implementation State

- (id)init {
    if (self = [super init]) {
        if (![self load]) {
            [self reset];
        }
    }
    return self;
}

- (NSDictionary *)load {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    return [defaults objectForKey:STATE_KEY];
}

- (id)get:(NSString *)key {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSDictionary* state = [defaults objectForKey:STATE_KEY];
    return [state objectForKey:STATE_KEY];
}

- (void)set:(NSString *)key value:(id)value {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSMutableDictionary* state = [NSMutableDictionary dictionaryWithDictionary:[defaults objectForKey:STATE_KEY]];
    [state setObject:value forKey:key];
    [defaults setObject:state forKey:STATE_KEY];
    [defaults synchronize];
}

- (void)reset {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    [defaults setObject:[NSDictionary dictionary] forKey:STATE_KEY];
    [defaults synchronize];
}

@end
