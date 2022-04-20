var express = require("express");
var { graphqlHTTP } = require("express-graphql");
var { buildSchema, graphql } = require("graphql");

var schema = buildSchema(`
    type RandomDie {
        numSides: Int!
        rollOnce: Int!
        roll(numRolls: Int!): [Int]
    }

    input MessageInput {
        content: String
        author: String
    }

    type Message {
        id: ID!
        content: String
        author: String
    }

    type Messages {
        messages: [Message]
    }

    type Query {
        getDie(numSides: Int): RandomDie
        getMessage(id: ID!): Message
        getMessages: [Message]
        ip: String
    }

    type Mutation {
        createMessage(input: MessageInput): Message
        updateMessage(id: ID!, input: MessageInput): Message
    }
`);

const loggingMiddleware = (req, res, next) => {
	console.log("ip:", req.ip);
	next();
};

class Message {
	constructor(id, { content, author }) {
		this.id = id;
		this.content = content;
		this.author = author;
	}
}

class RandomDie {
	constructor(numSides) {
		this.numSides = numSides;
	}

	rollOnce() {
		return 1 + Math.floor(Math.random() * this.numSides);
	}

	roll({ numRolls }) {
		var output = [];
		for (var i = 0; i < numRolls; i++) {
			output.push(this.rollOnce());
		}
		return output;
	}
}

var fakeDatabase = {};

var root = {
	getDie: ({ numSides }) => {
		return new RandomDie(numSides || 6);
	},
	getMessage: ({ id }) => {
		if (!fakeDatabase[id]) {
			throw new Error("no message exists with id " + id);
		}
		return new Message(id, fakeDatabase[id]);
	},
	getMessages: () => {
		let messages = Object.keys(fakeDatabase).map(
			(id) => new Message(id, fakeDatabase[id])
		);
		return messages;
	},
	createMessage: ({ input }) => {
		// Create a random id for our "database".
		var id = require("crypto").randomBytes(10).toString("hex");

		fakeDatabase[id] = input;
		return new Message(id, input);
	},
	updateMessage: ({ id, input }) => {
		if (!fakeDatabase[id]) {
			throw new Error("no message exists with id " + id);
		}
		// This replaces all old data, but some apps might want partial update.
		fakeDatabase[id] = input;
		return new Message(id, input);
	},
	ip: (args, request) => {
		return request.ip;
	},
};

var app = express();
app.use(loggingMiddleware);
app.use(
	"/graphql",
	graphqlHTTP({
		schema: schema,
		rootValue: root,
		graphiql: true,
	})
);
app.listen(4000);
console.log("Running a GraphQL API server at http://localhost:4000/graphql");
