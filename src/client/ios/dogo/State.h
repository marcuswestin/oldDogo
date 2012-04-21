//
//  State.h
//  dogo
//
//  Created by Marcus Westin on 4/21/12.
//  Copyright (c) 2012 Meebo. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface State : NSObject

- (void) set:(NSString*)key value:(id)value;
- (id) get:(NSString*)key;
- (NSDictionary*) load;


@end
