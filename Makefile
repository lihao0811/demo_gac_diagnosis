.PHONY: start stop restart logs status clean install help

# 颜色定义
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

# 进程ID文件
BACKEND_PID_FILE=.backend.pid
FRONTEND_PID_FILE=.frontend.pid

help:
	@echo "$(GREEN)广汽诊断系统 - 可用命令:$(NC)"
	@echo "  $(YELLOW)make install$(NC)  - 安装前后端依赖"
	@echo "  $(YELLOW)make start$(NC)    - 启动前端和后端服务"
	@echo "  $(YELLOW)make stop$(NC)     - 停止所有服务"
	@echo "  $(YELLOW)make restart$(NC)  - 重启所有服务"
	@echo "  $(YELLOW)make logs$(NC)     - 查看服务日志"
	@echo "  $(YELLOW)make status$(NC)   - 查看服务状态"
	@echo "  $(YELLOW)make clean$(NC)    - 清理日志和PID文件"

install:
	@echo "$(GREEN)正在安装后端依赖...$(NC)"
	@cd backend && npm install
	@echo "$(GREEN)正在安装前端依赖...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)依赖安装完成！$(NC)"

start:
	@echo "$(GREEN)正在启动服务...$(NC)"
	@$(MAKE) stop 2>/dev/null || true
	@mkdir -p logs
	@echo "$(YELLOW)启动后端服务...$(NC)"
	@cd backend && nohup npm run dev > ../logs/backend.log 2>&1 & echo $$! > ../$(BACKEND_PID_FILE)
	@sleep 4
	@if lsof -i:3021 -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "$(GREEN)✓ 后端服务启动成功 (端口 3021)$(NC)"; \
	else \
		echo "$(RED)✗ 后端服务启动失败，查看日志: tail -f logs/backend.log$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)启动前端服务...$(NC)"
	@cd frontend && nohup npm start > ../logs/frontend.log 2>&1 & echo $$! > ../$(FRONTEND_PID_FILE)
	@echo "$(YELLOW)等待前端服务启动（约需10-15秒）...$(NC)"
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		if lsof -i:3020 -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "$(GREEN)✓ 前端服务启动成功 (端口 3020)$(NC)"; \
			break; \
		fi; \
		sleep 1; \
		if [ $$i -eq 15 ]; then \
			echo "$(RED)✗ 前端服务启动超时，查看日志: tail -f logs/frontend.log$(NC)"; \
			exit 1; \
		fi; \
	done
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)所有服务启动完成！$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo "后端地址: $(YELLOW)http://localhost:3021$(NC)"
	@echo "前端地址: $(YELLOW)http://localhost:3020$(NC)"
	@echo ""
	@echo "使用 $(YELLOW)make logs$(NC) 查看日志"
	@echo "使用 $(YELLOW)make stop$(NC) 停止服务"

stop:
	@echo "$(YELLOW)正在停止服务...$(NC)"
	@if [ -f $(BACKEND_PID_FILE) ]; then \
		if kill -0 $$(cat $(BACKEND_PID_FILE)) 2>/dev/null; then \
			kill $$(cat $(BACKEND_PID_FILE)) 2>/dev/null || true; \
			echo "$(GREEN)✓ 后端服务已停止$(NC)"; \
		fi; \
		rm -f $(BACKEND_PID_FILE); \
	fi
	@if [ -f $(FRONTEND_PID_FILE) ]; then \
		if kill -0 $$(cat $(FRONTEND_PID_FILE)) 2>/dev/null; then \
			kill $$(cat $(FRONTEND_PID_FILE)) 2>/dev/null || true; \
			echo "$(GREEN)✓ 前端服务已停止$(NC)"; \
		fi; \
		rm -f $(FRONTEND_PID_FILE); \
	fi
	@lsof -ti:3021 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3020 | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)所有服务已停止$(NC)"

restart:
	@echo "$(YELLOW)正在重启服务...$(NC)"
	@$(MAKE) stop
	@sleep 1
	@$(MAKE) start

logs:
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)服务日志 (Ctrl+C 退出)$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@if [ -f logs/backend.log ] && [ -f logs/frontend.log ]; then \
		tail -f logs/backend.log logs/frontend.log; \
	elif [ -f logs/backend.log ]; then \
		tail -f logs/backend.log; \
	elif [ -f logs/frontend.log ]; then \
		tail -f logs/frontend.log; \
	else \
		echo "$(RED)没有找到日志文件$(NC)"; \
	fi

status:
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)服务状态$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@if [ -f $(BACKEND_PID_FILE) ] && kill -0 $$(cat $(BACKEND_PID_FILE)) 2>/dev/null; then \
		echo "后端服务: $(GREEN)运行中$(NC) (PID: $$(cat $(BACKEND_PID_FILE)))"; \
	else \
		echo "后端服务: $(RED)未运行$(NC)"; \
	fi
	@if [ -f $(FRONTEND_PID_FILE) ] && kill -0 $$(cat $(FRONTEND_PID_FILE)) 2>/dev/null; then \
		echo "前端服务: $(GREEN)运行中$(NC) (PID: $$(cat $(FRONTEND_PID_FILE)))"; \
	else \
		echo "前端服务: $(RED)未运行$(NC)"; \
	fi
	@echo ""
	@echo "端口占用情况:"
	@lsof -i:3021 -sTCP:LISTEN 2>/dev/null | grep LISTEN || echo "  3021: $(RED)未占用$(NC)"
	@lsof -i:3020 -sTCP:LISTEN 2>/dev/null | grep LISTEN || echo "  3020: $(RED)未占用$(NC)"

clean:
	@echo "$(YELLOW)正在清理...$(NC)"
	@rm -rf logs
	@rm -f $(BACKEND_PID_FILE) $(FRONTEND_PID_FILE)
	@echo "$(GREEN)清理完成$(NC)"
