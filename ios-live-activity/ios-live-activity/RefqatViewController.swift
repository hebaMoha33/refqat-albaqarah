import UIKit
import Capacitor


class RefqatViewController:
    CAPBridgeViewController
{

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()

        bridge?.registerPluginInstance(
            RefqatLiveActivityPlugin()
        )
    }
}