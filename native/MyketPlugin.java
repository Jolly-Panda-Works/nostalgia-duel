package __PACKAGE__;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ir.myket.billingclient.IabHelper;
import ir.myket.billingclient.util.Inventory;
import ir.myket.billingclient.util.Purchase;
import ir.myket.billingclient.util.SkuDetails;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Myket in-app billing for the web game: the same methods as the Bazaar plugin (connect, purchase,
 * consume, unfinished purchases, prices). The public key comes from the myket_public_key string
 * resource (added by scripts/myket.mjs); IabHelper verifies every purchase's signature with it.
 * IabHelper runs one operation at a time, so the calls wait in a queue.
 */
@CapacitorPlugin(name = "Myket")
public class MyketPlugin extends Plugin {
    /** The result codes for a purchase the player backed out of. */
    private static final int USER_CANCELED = 1;
    private static final int HELPER_USER_CANCELLED = -1005;

    private IabHelper helper;
    private boolean connected;
    private boolean busy;
    private final ArrayDeque<Runnable> queue = new ArrayDeque<>();
    /** Consuming needs the Purchase object; the game only keeps its token. */
    private final Map<String, Purchase> known = new HashMap<>();

    private void enqueue(Runnable task) {
        getActivity().runOnUiThread(() -> {
            queue.add(task);
            next();
        });
    }

    private void next() {
        if (busy || queue.isEmpty()) return;
        busy = true;
        queue.poll().run();
    }

    private void done() {
        busy = false;
        next();
    }

    private String publicKey() {
        int id = getContext().getResources().getIdentifier("myket_public_key", "string", getContext().getPackageName());
        return id == 0 ? "" : getContext().getString(id);
    }

    private JSObject toJs(Purchase purchase) {
        known.put(purchase.getToken(), purchase);
        JSObject o = new JSObject();
        o.put("orderId", purchase.getOrderId());
        o.put("purchaseToken", purchase.getToken());
        o.put("productId", purchase.getSku());
        o.put("purchaseTime", purchase.getPurchaseTime());
        return o;
    }

    private boolean ready(PluginCall call) {
        if (helper != null && connected) return true;
        call.reject("Not connected to Myket.", "NOT_CONNECTED");
        return false;
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (connected) {
            call.resolve();
            return;
        }
        String key = publicKey();
        if (key.isEmpty()) {
            call.reject("The Myket key is missing from this build.", "NO_KEY");
            return;
        }
        enqueue(() -> {
            if (connected) {
                call.resolve();
                done();
                return;
            }
            if (helper == null) helper = new IabHelper(getContext(), key);
            helper.startSetup(result -> {
                connected = result.isSuccess();
                if (connected) call.resolve();
                else {
                    helper = null;
                    call.reject(result.getMessage(), "NOT_CONNECTED");
                }
                done();
            });
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required.");
            return;
        }
        if (!ready(call)) return;
        String payload = call.getString("payload", "");
        enqueue(() -> {
            try {
                helper.launchPurchaseFlow(getActivity(), productId, (result, purchase) -> {
                    if (result.isSuccess()) call.resolve(toJs(purchase));
                    else if (result.getResponse() == USER_CANCELED || result.getResponse() == HELPER_USER_CANCELLED) call.reject("Purchase cancelled.", "CANCELLED");
                    else call.reject(result.getMessage(), "FAILED");
                    done();
                }, payload);
            } catch (Exception e) {
                call.reject("Couldn't start the purchase.", "FAILED", e);
                done();
            }
        });
    }

    @PluginMethod
    public void consume(PluginCall call) {
        String token = call.getString("purchaseToken");
        if (token == null || token.isEmpty()) {
            call.reject("purchaseToken is required.");
            return;
        }
        if (!ready(call)) return;
        Purchase purchase = known.get(token);
        if (purchase == null) {
            call.reject("Unknown purchase.", "FAILED");
            return;
        }
        enqueue(() -> {
            try {
                helper.consumeAsync(purchase, (consumed, result) -> {
                    if (result.isSuccess()) {
                        known.remove(token);
                        call.resolve();
                    } else call.reject(result.getMessage(), "FAILED");
                    done();
                });
            } catch (Exception e) {
                call.reject("Couldn't finish the purchase.", "FAILED", e);
                done();
            }
        });
    }

    /** Each product's price and title as Myket shows them. */
    @PluginMethod
    public void skuDetails(PluginCall call) {
        if (!ready(call)) return;
        List<String> ids;
        try {
            ids = call.getArray("productIds").toList();
        } catch (Exception e) {
            call.reject("productIds is required.");
            return;
        }
        enqueue(() -> {
            try {
                helper.queryInventoryAsync(true, ids, (result, inventory) -> {
                    if (result.isFailure()) call.reject(result.getMessage(), "FAILED");
                    else {
                        JSArray items = new JSArray();
                        for (String id : ids) {
                            SkuDetails sku = inventory.getSkuDetails(id);
                            if (sku == null) continue;
                            JSObject o = new JSObject();
                            o.put("productId", id);
                            o.put("price", sku.getPrice());
                            o.put("title", sku.getTitle());
                            items.put(o);
                        }
                        JSObject out = new JSObject();
                        out.put("products", items);
                        call.resolve(out);
                    }
                    done();
                });
            } catch (Exception e) {
                call.reject("Couldn't load the prices.", "FAILED", e);
                done();
            }
        });
    }

    /** Purchases that were paid but not consumed yet (e.g. the app closed mid-purchase). */
    @PluginMethod
    public void purchases(PluginCall call) {
        if (!ready(call)) return;
        enqueue(() -> {
            try {
                helper.queryInventoryAsync(false, null, (result, inventory) -> {
                    if (result.isFailure()) call.reject(result.getMessage(), "FAILED");
                    else {
                        JSArray items = new JSArray();
                        for (Purchase purchase : inventory.getAllPurchases()) items.put(toJs(purchase));
                        JSObject out = new JSObject();
                        out.put("purchases", items);
                        call.resolve(out);
                    }
                    done();
                });
            } catch (Exception e) {
                call.reject("Couldn't load purchases.", "FAILED", e);
                done();
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (helper != null) helper.dispose();
        helper = null;
        connected = false;
    }
}
