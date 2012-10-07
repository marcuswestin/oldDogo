#import "BTAppDelegate.h"
#import "FBConnect.h"

@interface AppDelegate : BTAppDelegate <FBSessionDelegate, FBDialogDelegate>

@property (nonatomic, retain) Facebook *facebook;
@property (nonatomic, copy) WVJBResponse* facebookResponse;

+ (AppDelegate*) instance;

- (void) netRequest:(NSDictionary*)params response:(WVJBResponse*)response;

@end
