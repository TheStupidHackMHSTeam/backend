package net.whatware.emergency.api;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import io.javalin.websocket.WsContext;
import io.javalin.websocket.WsMessageContext;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import static j2html.TagCreator.article;
import static j2html.TagCreator.attrs;
import static j2html.TagCreator.b;
import static j2html.TagCreator.p;
import static j2html.TagCreator.span;

public class EmergencyAPI {

	private static final Map<WsContext, String> userUsernameMap = new ConcurrentHashMap<>();
	private static int nextUserNumber = 1; // Assign to username for next connecting user

	public static void main(String[] args) {
		Javalin app = Javalin.create(config -> {
			config.staticFiles.add("/public", Location.CLASSPATH);
			config.router.mount(router -> {
				router.ws("/chat", ws -> {
					ws.onConnect(ctx -> {
						String username = "User" + nextUserNumber++;
						userUsernameMap.put(ctx, username);
						broadcastMessage("Server", (username + " joined the chat"));
					});
					ws.onClose(ctx -> {
						String username = userUsernameMap.get(ctx);
						userUsernameMap.remove(ctx);
						broadcastMessage("Server", (username + " left the chat"));
					});
					ws.onMessage(ctx -> {
						broadcastMessage(userUsernameMap.get(ctx), ctx.message());
					});
				});
			});
		});
		
		app.post("/reportfall", ctx -> {
			System.out.println(ctx.queryParam("long"));
			ctx.status(201);
		});
		
		app.ws("/dashsocket", ws -> {
		    ws.onConnect(ctx -> System.out.println("Connected"));
		    ws.onMessage(ctx -> {
		        ctx.send(ctx.message()); // convert to json and send back
		    });
		    ws.onBinaryMessage(ctx -> System.out.println("Message"));
		    ws.onClose(ctx -> System.out.println("Closed"));
		    ws.onError(ctx -> System.out.println("Errored"));
		});
		
		app.start(9090);
	}

	// Sends a message from one user to all users, along with a list of current
	// usernames
	private static void broadcastMessage(String sender, String message) {
		userUsernameMap.keySet().stream().filter(ctx -> ctx.session.isOpen()).forEach(session -> {
			session.send(Map.of("userMessage", createHtmlMessageFromSender(sender, message), "userlist",
					userUsernameMap.values()));
		});
	}

	// Builds a HTML element with a sender-name, a message, and a timestamp
	private static String createHtmlMessageFromSender(String sender, String message) {
		return article(b(sender + " says:"),
				span(attrs(".timestamp"), new SimpleDateFormat("HH:mm:ss").format(new Date())), p(message)).render();
	}

}