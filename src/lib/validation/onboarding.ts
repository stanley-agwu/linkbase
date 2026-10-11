import { z } from "zod";

import { handleSchema } from "./fields";

export const chooseUsernameSchema = z.object({ username: handleSchema });

export type ChooseUsernameInput = z.infer<typeof chooseUsernameSchema>;
