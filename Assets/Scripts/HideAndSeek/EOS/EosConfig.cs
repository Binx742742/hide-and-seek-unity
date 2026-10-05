// Portal IDs for a later EOS plugin hook. Placeholders stay in git.
// The client secret is not a gameplay value and must not be committed.

using System;
using UnityEngine;

namespace HideAndSeek.EOS
{
    /// <summary>
    /// Product, sandbox, deployment, and client ids from the Epic Developer Portal.
    /// Create via Assets → Create → HideAndSeek → EOS Config.
    /// The committed example is Assets/Settings/EosConfig.asset. See docs/eos-setup.md.
    /// </summary>
    [CreateAssetMenu(fileName = "EosConfig", menuName = "HideAndSeek/EOS Config", order = 10)]
    public class EosConfig : ScriptableObject
    {
        public const string PlaceholderPrefix = "YOUR_";

        [Header("Developer Portal — replace YOUR_* . Do not commit real credentials.")]
        public string productId = "YOUR_PRODUCT_ID";
        public string sandboxId = "YOUR_SANDBOX_ID";
        public string deploymentId = "YOUR_DEPLOYMENT_ID";
        public string clientId = "YOUR_CLIENT_ID";

        [Tooltip("Leave empty in the repo. A value here would be committed. Prefer the EOS_CLIENT_SECRET environment variable on the Editor process, or the official plugin config kept out of git. See docs/eos-setup.md.")]
        public string clientSecret = "";

        /// <summary>
        /// True when product, sandbox, deployment, and client id are non-empty and not YOUR_* placeholders.
        /// The client secret is optional and is not required here.
        /// </summary>
        public bool HasPortalIds
        {
            get
            {
                return IsFilled(productId)
                    && IsFilled(sandboxId)
                    && IsFilled(deploymentId)
                    && IsFilled(clientId);
            }
        }

        /// <summary>
        /// Asset field when it is filled, otherwise the EOS_CLIENT_SECRET environment variable.
        /// Empty when neither is set. Never log the result.
        /// </summary>
        public string ResolveClientSecret()
        {
            if (IsFilled(clientSecret))
                return clientSecret;
            string fromEnv = Environment.GetEnvironmentVariable("EOS_CLIENT_SECRET");
            return string.IsNullOrEmpty(fromEnv) ? "" : fromEnv;
        }

        public static bool IsFilled(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return false;
            if (value.IndexOf(PlaceholderPrefix, StringComparison.Ordinal) >= 0)
                return false;
            if (value.IndexOf("PLACEHOLDER", StringComparison.OrdinalIgnoreCase) >= 0)
                return false;
            return true;
        }

        void OnValidate()
        {
            if (!string.IsNullOrEmpty(clientSecret))
                Debug.LogWarning("[EOS] ClientSecret is set on " + name + ". Do not commit it. Clear the field and use EOS_CLIENT_SECRET, or keep a local asset out of git. See docs/eos-setup.md.");
        }
    }
}
