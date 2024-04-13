package net.whatware.emergency.api;

import io.javalin.Javalin;

public class HelloWorld {
    public static void main(String[] args) {
        var app = Javalin.create()
            .get("/ping", ctx -> ctx.result("pong"))
            .start(9090);
    }
}