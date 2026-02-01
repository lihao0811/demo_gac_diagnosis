.PHONY: build clean install

build:
	cd frontend && pnpm install && pnpm run build
	rm -rf dist
	mv frontend/build dist
	@echo "构建完成！静态资源在 dist 目录"

clean:
	rm -rf dist
	rm -rf frontend/build

install:
	cd frontend && pnpm install
