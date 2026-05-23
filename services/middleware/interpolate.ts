// Shared template interpolation used by trigger actions that need to
// render the same set of ${...} placeholders into different output
// formats (chat messages, HTTP URLs/headers/bodies, …). Kept as a
// plain serializable shape so it survives the JSON trip through
// scheduled-action storage.

export interface InterpolationContext {
    user?: string;
    target?: string;
    args?: string[];
    reward?: string;
    rewardCost?: number;
    raider?: string;
    viewers?: number;
}

export function interpolateTemplate(template: string, ctx: InterpolationContext): string {
    if (!template) return template;
    let result = template;

    if (ctx.user !== undefined) {
        result = result.replace(/\$\{user\}/g, ctx.user);
    }
    if (ctx.target !== undefined) {
        result = result.replace(/\$\{target\}/g, ctx.target);
    }
    result = result.replace(/\$\{args\[(\d+)\]\}/g, (_, index) => {
        const i = parseInt(index, 10);
        return (ctx.args && ctx.args[i]) || '';
    });
    if (ctx.reward !== undefined) {
        result = result.replace(/\$\{reward\}/g, ctx.reward);
    }
    if (ctx.rewardCost !== undefined) {
        result = result.replace(/\$\{reward_cost\}/g, String(ctx.rewardCost));
    }
    if (ctx.raider !== undefined) {
        result = result.replace(/\$\{raider\}/g, ctx.raider);
    }
    if (ctx.viewers !== undefined) {
        result = result.replace(/\$\{viewers\}/g, String(ctx.viewers));
    }
    return result;
}
