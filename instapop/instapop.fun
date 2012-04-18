import jsonp
import tap

import "./fakeResponse"

instagramApiKey = '98953.f59def8.f79d9cb61e4342d7b5867337bcfed14b'

popularRequest = jsonp.get("https://api.instagram.com/v1/media/popular?access_token="+instagramApiKey) // fakeResponse

focusItem = null

if popularRequest.loading {
	"Loading..."
}
if popularRequest.error {
	"Error: " popularRequest.error
}
if popularRequest.response {
	for item in popularRequest.response.data {
		// <div>"Tags: "item.tags</div>
		if item.type is 'image' {
			<div style={ float:'left', cursor:'pointer' }>
				thumb = item.images.thumbnail
				<img src=thumb.url style={ width:thumb.width, height:thumb.height, margin:'0 0 8px 4px' } #tap.button(handler() {
					focusItem set: item
				}) />
			</div>
		}
	}
}

if focusItem {
	<div style={ position:'fixed', top:0, left:0 width:'100%' height:'100%' } #tap.button(handler() { focusItem set: null })>
		<div style={ width:400 background:'#fff' margin:'40px auto' borderRadius:10 padding:'10px' }>
			image = focusItem.images.standard_resolution //switch to low_resolution on non-retina
			<img src=image.url style={ width:image.width/2, height:image.height/2, margin:'0 auto' display:'block' } />
			
			for comment in focusItem.comments.data {
				<div class="comment">comment.from.full_name " said: " comment.text</div>
			}
		</div>
	</div>
}