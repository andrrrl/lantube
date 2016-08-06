$(function(){
	console.log('Hola mundo.');
	
	
	$('#agregar').on('click', function(e){
		e.preventDefault();
		
		$.ajax({
			
			url: '/videos',
			method: 'post',
			data: {
				url: $('#video').val(),
				order: $('.orden').length + 1 || 1
			},
			success: function(new_video) {
				console.log('Si!');
				$('#video').val('');
				
				$('.lista-videos').append( 
					'<tr>' +
						'<td class="orden">' +
							new_video.order +
						'</td>' +
						'<td>' +
							new_video.url +
						'</td>' +
					'</tr>'
				);
				
			}
			
		});
		
	})
	
	
});