/**
 * @Author: Adithya
 * @Date:   2025-07-07
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-08
 */
import { Client } from "@gradio/client";

const SPACE_NAME = "PVK-Varma/Classifier_DistilBERT";

const call_bert = async (prompt: string): Promise<{ mode: string }> => {
  const app = await Client.connect(SPACE_NAME);
  const result = await app.predict("/predict", [prompt]);
  return { mode: result.data[0] };
};

export default call_bert;
