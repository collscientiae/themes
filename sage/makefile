.PHONY=build clean

build: clean
	sass --no-cache \
         --style=compressed \
         src/static/style.sass:src/static/style.css

clean:
	-$(RM) src/static/style.css
	-$(RM) src/static/style.*.map
