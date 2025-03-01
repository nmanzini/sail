#!/bin/bash

# heroku_logs.sh - A script to easily view Heroku logs with different options

# Display help message
show_help() {
    echo "Usage: ./heroku_logs.sh [OPTION]"
    echo "View logs for your Heroku application with different options."
    echo ""
    echo "Options:"
    echo "  -t, --tail         Show live logs (tail)"
    echo "  -n, --lines NUM    Show NUM lines of logs (default: 100)"
    echo "  -a, --app          Show only application logs"
    echo "  -p, --platform     Show only Heroku platform logs"
    echo "  -h, --help         Show this help message"
    echo ""
}

# Default values
LINES=100
APP_FILTER=""

# Parse command line arguments
case "$1" in
    -t|--tail)
        echo "Showing live logs (press Ctrl+C to exit)..."
        heroku logs --tail
        ;;
    -n|--lines)
        if [[ -z "$2" || ! "$2" =~ ^[0-9]+$ ]]; then
            echo "Error: Please provide a valid number of lines"
            show_help
            exit 1
        fi
        echo "Showing last $2 lines of logs..."
        heroku logs -n "$2"
        ;;
    -a|--app)
        echo "Showing only application logs..."
        heroku logs --source app
        ;;
    -p|--platform)
        echo "Showing only Heroku platform logs..."
        heroku logs --source heroku
        ;;
    -h|--help)
        show_help
        ;;
    *)
        # Default behavior - show recent logs
        echo "Showing last $LINES lines of logs (use -h for more options)..."
        heroku logs -n $LINES
        ;;
esac

exit 0 