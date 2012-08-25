
Screen flash on appDidEnterForeground
-------------------------------------
- The elements that flash are those with overflow:scroll and -webkit-overflow-scrolling:touch.
- Changing to -webkit-overflow-scrolling:none and then back to :touch still causes the flash (but delays the flash until it's set back to :touch)
- One fix would be to set fixed elements to position:fixed and then let the whole body scroll, but then different views would vertically scroll together.
- Possibly fix is taking a screenshot of app on entering background, and then showing that while the app is brought back