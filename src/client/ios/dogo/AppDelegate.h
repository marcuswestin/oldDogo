#import "BTAppDelegate.h"
#import "FBConnect.h"

@interface AppDelegate : BTAppDelegate <FBSessionDelegate, FBDialogDelegate, UITextViewDelegate>

@property (nonatomic, retain) Facebook *facebook;
@property (nonatomic, copy) ResponseCallback facebookCallback;

+ (AppDelegate*) instance;

@property (atomic, strong) UITextView* textInput;
- (void) showTextInput:(NSDictionary*) params;
- (void) hideTextInput;
- (void) sizeTextInput;
- (CGRect) rectFromDict:(NSDictionary*) params;
- (UIReturnKeyType) returnKeyTypeFromDict:(NSDictionary*) params;
- (void) animateTextInput:(NSDictionary*) params;
@end
