#import "BTAppDelegate.h"
#import "BTResponse.h"

@interface AppDelegate : BTAppDelegate

+ (AppDelegate*) instance;

- (void) netRequest:(NSDictionary*)params response:(BTResponse*)response;

@end
