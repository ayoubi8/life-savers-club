import { DISPLAY_TYPES, type FormField, type FormSchema } from "./schema";

export type Step = {
  id: string;
  title?: string;
  description?: string;
  fields: FormField[];
};

export type FormLayout = "page" | "question";

/**
 * Splits a form into the screens a respondent walks through.
 * - "page": one step per page that has questions.
 * - "question": one step per question; headings/text blocks stick to the next question.
 */
export function buildSteps(schema: FormSchema, layout: FormLayout): Step[] {
  if (layout === "question") {
    const steps: Step[] = [];
    let buffer: FormField[] = [];

    schema.pages.forEach((page) => {
      let firstOfPage = true;
      for (const field of page.fields) {
        if (DISPLAY_TYPES.includes(field.type)) {
          buffer.push(field);
          continue;
        }
        steps.push({
          id: field.id,
          title: firstOfPage ? page.title : undefined,
          fields: [...buffer, field],
        });
        buffer = [];
        firstOfPage = false;
      }
    });

    if (buffer.length > 0) {
      if (steps.length > 0) steps[steps.length - 1].fields.push(...buffer);
      else steps.push({ id: "display", fields: buffer });
    }
    return steps.length > 0 ? steps : [{ id: "empty", fields: [] }];
  }

  const steps = schema.pages
    .map((page, index) => ({
      id: page.id,
      title: page.title,
      // The first page's description is the form description, shown under the title.
      description: index > 0 ? page.description : undefined,
      fields: page.fields,
    }))
    .filter((step) => step.fields.length > 0);
  return steps.length > 0 ? steps : [{ id: "empty", fields: [] }];
}
