import socket

if __name__ == '__main__':

	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.connect(('10.0.0.11', 80))
	data = open('out.bmp').read()
	print '> sending %s bytes of data' % len(data)
	s.sendall('POST /img HTTP/1.1\r\n')
	s.sendall('Content-length: %s\r\n' % len(data))
	s.sendall('\r\n')
	s.sendall(data)
	while 1:
		data = s.recv(1024)
		if not data: break
		print data,
	print
	s.close()

