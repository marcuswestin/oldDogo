import ../util
import ../config

head = {
	render:template(scroller) {
		scroller.renderHead(template() {
			view = scroller.stack.last
			<div class="head">
				if config.dev { util.renderDevBar() }
				<div class="title">
					view.contact ? view.contact.fullName : 'Dogo'
				</div>
				if scroller.stack.length is > 1 {
					<div class="button back">'Back'</div #tap.button(handler() {
						scroller.pop()
					})>
				}
			</div>
		})
	}
}

