#import "BTAppDelegate.h"
#import "FBConnect.h"
#import "BTResponse.h"

@interface AppDelegate : BTAppDelegate <FBSessionDelegate, FBDialogDelegate>

@property (nonatomic, strong) Facebook *facebook;
@property (nonatomic, strong) BTResponse* facebookResponse;

+ (AppDelegate*) instance;

- (void) netRequest:(NSDictionary*)params response:(BTResponse*)response;

@end
