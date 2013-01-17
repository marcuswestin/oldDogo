Storage
-------
For now, we optimize for simplicity. Json blobs are stored as-is.
Later, when it's time, apply two transformations:
1. encode property names (begun this in makeEncoder.js, but stopped)
2. encode properties with message-pack

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

Client UIDs on messages 
-----------------------
When sending a message, it is necessary to be able to uniquely identify it even before it has been created on the server. Consider sending a message while nearly-offline. If we don't get a response from the server, one of two things has happened: 1) the message was recorded and delivered, or 2) the message never reached the server. For case 1, we want to be able to recognize that *this message* was received when back online. For case 2, we need to be able to get all messages from the server and detect that this message is not among them.

The client goes about this by adding an ever increasing numeric client_uid to the message. The database has a unique index on message across (account_id, client_uid). Using this, the client can detect whether the message was succesfully sent by

- On refresh conversation, check if the client_uid message is in there
- On attempt resend, if server already has received the message the server can respond with the relevant info about the message
- While offline, the client can keep a list of unsent messages