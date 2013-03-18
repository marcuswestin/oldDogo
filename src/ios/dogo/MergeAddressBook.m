//
//  MergeAddressBook.m
//  dogo
//
//  Created by Marcus Westin on 3/17/13.
//  Copyright (c) 2013 Flutterby. All rights reserved.
//

#import "MergeAddressBook.h"
#import "BTSql.h"
#import "BTAddressBook.h"

@implementation MergeAddressBook

static MergeAddressBook* instance;

- (void)setup:(BTAppDelegate *)app {
    instance = self;
    
    [app handleCommand:@"mergeAddressBook" handler:^(id params, BTResponseCallback callback) {
        [self mergeAddressBook:params callback:callback];
    }];
}


//static int ADDRESS_TYPE_DOGO = 1;
static int ADDRESS_TYPE_EMAIL = 2;
static int ADDRESS_TYPE_PHONE = 3;
//static int ADDRESS_TYPE_FACEBOOK = 4;

- (void) mergeAddressBook:(NSDictionary*)params callback:(BTResponseCallback)callback {
    [[BTSql getQueue] inDatabase:^(FMDatabase *db) {
        FMResultSet* resultSet = [db executeQuery:@"SELECT addressType, addressId FROM contact"];
        NSMutableSet* knownAddresses = [NSMutableSet set];
        while ([resultSet next]) {
            [knownAddresses addObject:[self keyForAddressType:[resultSet intForColumnIndex:0] addressId:[resultSet stringForColumnIndex:1]]];
        }
        
        [BTAddressBook allEntries:^(id err, id responseData) {
            if (err) { return callback(err, nil); }
            for (id entry in responseData[@"entries"]) {
                // recordId, name, emailAddresses, phoneNumbers, hasImage
                NSMutableArray* newAddressesList = [NSMutableArray array];
                int contactUid = 1;
                for (NSString* phoneNumber in entry[@"phoneNumbers"]) {
                    if ([knownAddresses containsObject:[self keyForAddressType:ADDRESS_TYPE_PHONE addressId:phoneNumber]]) { continue; }
                    NSNumber* hasLocalImage = [NSNumber numberWithBool:[entry[@"hasLocalImage"] boolValue]];
                    NSArray* arr = @[[NSNumber numberWithInt:contactUid++], [NSNumber numberWithInt:ADDRESS_TYPE_PHONE], phoneNumber, [NSNumber numberWithInt:1], entry[@"name"], [NSNumber numberWithInt:0], entry[@"recordId"], hasLocalImage];
                    [newAddressesList addObject:arr];
                    //                    [newAddresses addObject:@{ @"addressType":[NSNumber numberWithInt:ADDRESS_TYPE_PHONE], @"addressId":phoneNumber, @"createdTime":[NSNumber numberWithInt:1], @"name":entry[@"name"], @"localId":entry[@"recordId"], @"hasLocalImage":entry[@"hasLocalImage"]
                    //                     }];
                }
                for (NSString* emailAddress in entry[@"emailAddresses"]) {
                    if ([knownAddresses containsObject:[self keyForAddressType:ADDRESS_TYPE_EMAIL addressId:emailAddress]]) { continue; }
                    //                    [newAddresses addObject:@{ @"addressType":[NSNumber numberWithInt:ADDRESS_TYPE_EMAIL], @"addressId":emailAddress, @"createdTime":[NSNumber numberWithInt:1], @"name":entry[@"name"], @"localId":entry[@"recordId"], @"hasLocalImage":entry[@"hasLocalImage"]
                    //                     }];
                    NSNumber* hasLocalImage = [NSNumber numberWithBool:[entry[@"hasLocalImage"] boolValue]];
                    [newAddressesList addObject:@[[NSNumber numberWithInt:contactUid++], [NSNumber numberWithInt:ADDRESS_TYPE_EMAIL], emailAddress, [NSNumber numberWithInt:1], entry[@"name"], [NSNumber numberWithInt:0], entry[@"recordId"], hasLocalImage]];
                }
                
                // post to server
                [[BTSql getQueue] inTransaction:^(FMDatabase *db, BOOL *rollback) {
                    NSString* sql = @"INSERT INTO contact (contactUid, addressType, addressId, createdTime, name, pictureUploadedTime, localId, hasLocalImage) VALUES (?,?,?,?,?,?,?,?)";
                    for (id newAddress in newAddressesList) {
                        BOOL success = [db executeUpdate:sql withArgumentsInArray:newAddress];
                        if (!success) { return callback(@"Could not enter into databse", nil); }
                    }
                    callback(nil,nil);
                }];
            }
        }];
    }];
}

- (NSString*) keyForAddressType:(int) addressType addressId:(NSString*)addressId {
    return [NSString stringWithFormat:@"%d-%@", addressType, addressId];
}

@end
