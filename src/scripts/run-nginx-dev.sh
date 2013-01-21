killall nginx
cat src/js/server/config/nginx.conf | sed "s/\/var/\/usr\/local\/var/" | sed "s/\/etc/\/usr\/local\/etc/" | sed 's/listen 80/listen 8080/' > /usr/local/etc/nginx/nginx.conf
mkdir -p /usr/local/var/log/nginx
touch /usr/local/var/log/nginx/access.log
touch /usr/local/var/log/nginx/error.log
/usr/local/sbin/nginx
