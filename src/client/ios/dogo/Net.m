//
//  Net.m
//  dogo
//
//  Created by Marcus Westin on 4/21/12.
//  Copyright (c) 2012 Meebo. All rights reserved.
//

#import "Net.h"

@implementation Net

- (void)request:(NSDictionary *)bridgeData responseCallback:(ResponseCallback)responseCallback {
    NSString* url = [bridgeData objectForKey:@"url"];
    NSString* method = [bridgeData objectForKey:@"method"];
    NSDictionary* params = [bridgeData objectForKey:@"params"];
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:url]];
    [request setHTTPMethod:method];
    [request setHTTPBody:[params JSONData]];
    [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [[AFJSONRequestOperation JSONRequestOperationWithRequest:request success:^(NSURLRequest *request, NSHTTPURLResponse *response, id responseJson) {
        responseCallback(nil, responseJson);
    } failure:^(NSURLRequest *request, NSHTTPURLResponse *response, NSError *err, id responseJson) {
        NSLog(@"net.request ERROR %@ %@", err, responseJson);
        NSMutableDictionary* error = [NSMutableDictionary dictionary];
        [error setObject:[NSNumber numberWithInteger:[err code]] forKey:@"code"];
        if (responseJson) {
            [error setObject:responseJson forKey:@"message"];
        }
        responseCallback(error, nil);
    }] start];

}

@end
