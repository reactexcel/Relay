/**
 * ./data/schema.js
 */

/* ... */
import {
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLID,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString
} from 'graphql';

import {
    connectionArgs,
    connectionDefinitions,
    connectionFromArray,
    fromGlobalId,
    globalIdField,
    mutationWithClientMutationId,
    nodeDefinitions
} from 'graphql-relay';

import {
    Game,
    HidingSpot,
    checkHidingSpotForTreasure,
    getGame,
    getHidingSpot,
    getHidingSpots,
    getTurnsRemaining
} from './database';
/**
 * We get the node interface and field from the Relay library.
 *
 * The first method defines the way we resolve an ID to its object.
 * The second defines the way we resolve an object to its GraphQL type.
 */
const {nodeInterface, nodeField} = nodeDefinitions((globalId) => {
    const {type, id} = fromGlobalId(globalId);
    if (type === 'Game') {
        return getGame(id);
    } else if (type === 'HidingSpot') {
        return getHidingSpot(id);
    } else {
        return null;
    }
}, (obj) => {
    if (obj instanceof Game) {
        return gameType;
    } else if (obj instanceof HidingSpot) {
        return hidingSpotType;
    } else {
        return null;
    }
});

/**
 * Define your own types here
 */

const gameType = new GraphQLObjectType({
    name: 'Game',
    description: 'A treasure search game',
    fields: () => ({
        id: globalIdField('Game'),
        hidingSpots: {
            type: hidingSpotConnection,
            description: 'Places where treasure might be hidden',
            args: connectionArgs,
            resolve: (game, args) => connectionFromArray(getHidingSpots(), args)
        },
        turnsRemaining: {
            type: GraphQLInt,
            description: 'The number of turns a player has left to find the treasure',
            resolve: () => getTurnsRemaining()
        }
    }),
    interfaces: [nodeInterface]
});

const hidingSpotType = new GraphQLObjectType({
    name: 'HidingSpot',
    description: 'A place where you might find treasure',
    fields: () => ({
        id: globalIdField('HidingSpot'),
        hasBeenChecked: {
            type: GraphQLBoolean,
            description: 'True if this spot has already been checked for treasure',
            resolve: (hidingSpot) => hidingSpot.hasBeenChecked
        },
        hasTreasure: {
            type: GraphQLBoolean,
            description: 'True if this hiding spot holds treasure',
            resolve: (hidingSpot) => {
                if (hidingSpot.hasBeenChecked) {
                    return hidingSpot.hasTreasure;
                } else {
                    return null; // Shh... it's a secret!
                }
            }
        }
    }),
    interfaces: [nodeInterface]
});/**
 * Define your own connection types here
 */
const {connectionType: hidingSpotConnection} = connectionDefinitions({name: 'HidingSpot', nodeType: hidingSpotType});

/**
 * This is the type that will be the root of our query,
 * and the entry point into our schema.
 */
const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        node: nodeField,
        game: {
            type: gameType,
            resolve: () => getGame()
        }
    })
});

/**
 * This is the type that will be the root of our mutations,
 * and the entry point into performing writes in our schema.
 */
const CheckHidingSpotForTreasureMutation = mutationWithClientMutationId({
    name: 'CheckHidingSpotForTreasure',
    inputFields: {
        id: {
            type: new GraphQLNonNull(GraphQLID)
        }
    },
    outputFields: {
        hidingSpot: {
            type: hidingSpotType,
            resolve: ({localHidingSpotId}) => getHidingSpot(localHidingSpotId)
        },
        game: {
            type: gameType,
            resolve: () => getGame()
        }
    },
    mutateAndGetPayload: ({id}) => {
        const localHidingSpotId = fromGlobalId(id).id;
        checkHidingSpotForTreasure(localHidingSpotId);
        return {localHidingSpotId};
    }
});
const mutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({checkHidingSpotForTreasure: CheckHidingSpotForTreasureMutation})
});

/**
 * Finally, we construct our schema (whose starting query type is the query
 * type we defined above) and export it.
 */
export const Schema = new GraphQLSchema({query: queryType, mutation: mutationType});
