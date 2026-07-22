// src/middleware/validate.js
// ⚡ Zod-based schema validation middleware
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => ({
        campo: i.path.join('.'),
        mensagem: i.message
      }));
      return res.status(400).json({ erro: 'Dados inválidos', detalhes: issues });
    }
    // Replace with parsed (coerced/defaulted) data
    if (source === 'body') req.body = parsed.data;
    else if (source === 'query') req.query = parsed.data;
    else req.params = parsed.data;
    return next();
  };
}
