import { ethers } from 'ethers';

// Minimal x402 client stub. In production replace with real x402 API calls.
export async function purchaseResearch({ market, agentNote } = {}) {
  // If an agent wallet is configured, create and sign a dummy transaction to represent payment.
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  const rpc = process.env.ETH_RPC_URL;

  if (!privateKey || !rpc) {
    // Simulation path: log and return ok.
    console.warn('x402.purchaseResearch: no AGENT_WALLET_PRIVATE_KEY or ETH_RPC_URL — simulating purchase');
    return { ok: true, tx: null, simulated: true };
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Create a tiny value transfer as a stand-in for a purchase. In real flow you'd call x402's API.
    const tx = await wallet.sendTransaction({ to: wallet.address, value: ethers.utils.parseEther('0') });
    await tx.wait?.();
    return { ok: true, tx: tx.hash || null };
  } catch (err) {
    console.error('x402.purchaseResearch error', err?.message ?? err);
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export default { purchaseResearch };
