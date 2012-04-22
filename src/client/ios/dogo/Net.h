//
//  Net.h
//  dogo
//
//  Created by Marcus Westin on 4/21/12.
//  Copyright (c) 2012 Meebo. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BTAppDelegate.h"

@interface Net : NSObject

- (void) request:(NSDictionary*)bridgeData responseCallback:(ResponseCallback)responseCallback;

@end
