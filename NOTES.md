
Screen flash on appDidEnterForeground
-------------------------------------
- The elements that flash are those with overflow:scroll and -webkit-overflow-scrolling:touch.
- Changing to -webkit-overflow-scrolling:none and then back to :touch still causes the flash (but delays the flash until it's set back to :touch)
- One fix would be to set fixed elements to position:fixed and then let the whole body scroll, but then different views would vertically scroll together.
- Possibly fix is taking a screenshot of app on entering background, and then showing that while the app is brought back


Native UITextView vs HTML <input>
---------------------------------
It would be great to use the html input for ease of manipulation and styling. It's not possible for two reasons:
1. The keyboard is displayed with a top bar (Previous/Next/Done) that's ugly, and
2. The UIWebView automatically scrolls the content such that the input comes into view
Instead, we need to display a UITextView. The best way to style it is to make the background color of the text input transparent, position it absolutely on the screen, and then render a background behind the transparent UITextView inside the web view. The one short coming of this approach is that the text input cannot scroll together with the webview's content.