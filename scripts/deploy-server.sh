BUILD=$1

echo "Deploy $BUILD"

scp $BUILD stg.dogoapp.com:~/
