#!/usr/bin/expect -f
set timeout -1
spawn agy
expect {
    "yes" { send "y\r"; exp_continue }
    "y/n" { send "y\r"; exp_continue }
    "yes & alwz" { send "\r"; exp_continue }
    eof
}
