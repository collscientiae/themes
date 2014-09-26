THEMES := $(wildcard */.)

.PHONY: all $(THEMES)

all: $(THEMES)

$(THEMES):
	$(MAKE) -C $@
