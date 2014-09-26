.PHONY=build clean

build: clean
	sass --no-cache \
         --style=compressed \
         src/static/main.scss:src/static/main.css

clean:
	-$(RM) src/static/main.css
