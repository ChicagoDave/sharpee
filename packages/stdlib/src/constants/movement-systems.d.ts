/**
 * Movement Systems for Interactive Fiction
 *
 * Different navigation paradigms for moving between locations
 */
export interface MovementSystem {
    name: string;
    directions: Record<string, string>;
}
export declare const MOVEMENT_SYSTEMS: {
    COMPASS: {
        name: string;
        directions: {
            north: string;
            n: string;
            south: string;
            s: string;
            east: string;
            e: string;
            west: string;
            w: string;
            northeast: string;
            ne: string;
            northwest: string;
            nw: string;
            southeast: string;
            se: string;
            southwest: string;
            sw: string;
            up: string;
            u: string;
            down: string;
            d: string;
            in: string;
            out: string;
        };
    };
    NAUTICAL: {
        name: string;
        directions: {
            fore: string;
            f: string;
            forward: string;
            aft: string;
            a: string;
            backward: string;
            port: string;
            p: string;
            left: string;
            starboard: string;
            sb: string;
            right: string;
            up: string;
            u: string;
            above: string;
            down: string;
            d: string;
            below: string;
        };
    };
    CLOCK: {
        name: string;
        directions: {
            '12': string;
            twelve: string;
            '1': string;
            one: string;
            '2': string;
            two: string;
            '3': string;
            three: string;
            '4': string;
            four: string;
            '5': string;
            five: string;
            '6': string;
            six: string;
            '7': string;
            seven: string;
            '8': string;
            eight: string;
            '9': string;
            nine: string;
            '10': string;
            ten: string;
            '11': string;
            eleven: string;
            up: string;
            down: string;
        };
    };
};
