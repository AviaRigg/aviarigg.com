// Product availability check — include on all product pages
// Usage: add data-product-id="your-product-id" to the <body> tag
// e.g. <body data-product-id="f1-sf25">

(async function() {
  const productId = document.body.dataset.productId;
  if (!productId) return;

  try {
    const { createClient } = supabase;
    const _sb = createClient(
      'https://bbyiezjvonacajigqoik.supabase.co',
      'sb_publishable_cINDYla6QRiEpRWunZVFqQ_E5q2LqHb'
    );

    const { data } = await _sb
      .from('shop_products')
      .select('status')
      .eq('id', productId)
      .single();

    if (!data) return; // product not in DB, allow access

    const status = data.status;

    if (status === 'hidden' || status === 'draft') {
      // Check if admin — admins can still access
      const { data: { session } } = await _sb.auth.getSession();
      if (session) {
        const { data: profile } = await _sb
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role === 'admin') return; // admin can view
      }
      // Redirect non-admins to not-available page
      window.location.replace(`/pages/not-available?reason=${status}&from=${encodeURIComponent(window.location.pathname)}`);
    }
  } catch(e) {
    // On error, allow access (fail open)
    console.warn('Product check failed:', e);
  }
})();
