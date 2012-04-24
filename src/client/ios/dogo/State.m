//
//  State.m
//  dogo
//
//  Created by Marcus Westin on 4/21/12.
//  Copyright (c) 2012 Meebo. All rights reserved.
//

#import "State.h"

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
    NSData* jsonData = [NSData dataWithContentsOfFile:[self getFilePath]];
    NSDictionary* state = jsonData
        ? [NSJSONSerialization JSONObjectWithData:jsonData options:NSJSONReadingAllowFragments error:nil]
        : [NSDictionary dictionary];
    return state;
}

- (id)get:(NSString *)key {
    NSDictionary* state = [self load];
    return [state objectForKey:key];
}

- (void)set:(NSString *)key value:(id)value {
    NSMutableDictionary* state = [NSMutableDictionary dictionaryWithDictionary:[self load]];
    [state setValue:value forKey:key];
    NSData* jsonData = [NSJSONSerialization dataWithJSONObject:state options:NSJSONWritingPrettyPrinted error:nil];
    [jsonData writeToFile:[self getFilePath] atomically:YES];
}

- (void)reset {
    [[NSData data] writeToFile:[self getFilePath] atomically:YES];
}

- (NSString *)getFilePath {
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsDirectory = [paths objectAtIndex:0];
    return [documentsDirectory stringByAppendingPathComponent:@"dogo.state"];
}

@end
