import { defineAutoFunction } from "@core/menu";

// Auto function will run on every message
export const logger = defineAutoFunction(async ({ text, msg }) => {
    // console.log(text, msg);
});
